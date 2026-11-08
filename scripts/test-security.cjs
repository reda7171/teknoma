/* Exercises actual security modules with isolated cookies/database fixtures.
 * No production network calls or database writes. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
const jar = new Map();
let admin = null, customer = null;
const cache = new Map();
const fixtures = {
  'server-only': {},
  'next/headers': { cookies: async () => ({
    get: name => jar.has(name) ? { value: jar.get(name) } : undefined,
    getAll: () => [...jar].map(([name,value]) => ({ name,value })),
    set: (name,value) => jar.set(name,value),
  }) },
  'next/server': { NextResponse: Response },
  '@/lib/admin-auth': {
    getAuthenticatedAdmin: async () => admin,
    hasAdminRole: (user,roles) => !!user && roles.includes(user.role),
  },
  '@/lib/prisma': { prisma: { customer: { findUnique: async () => customer } } },
};
function load(file) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} }; cache.set(absolute,module);
  const code = ts.transpileModule(fs.readFileSync(absolute,'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = id => {
    if (Object.hasOwn(fixtures,id)) return fixtures[id];
    if (id.startsWith('@/')) return load(id.replace('@/', 'src/') + '.ts');
    if (id === './admin-auth') return fixtures['@/lib/admin-auth'];
    if (id.startsWith('.')) return load(path.relative(root,path.resolve(path.dirname(absolute),id + '.ts')));
    return require(id);
  };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename: absolute })(localRequire,module,module.exports);
  return module.exports;
}
let count = 0;
async function test(name, run) { await run(); count++; console.log('PASS ' + name); }
async function main() {
  const session = load('src/lib/session-token.ts');
  await test('sessions reject changed passwords, purpose confusion, expiry and tampering', () => {
    const token = session.createSessionToken('user1','hash1','admin',1000);
    assert.equal(session.verifySessionToken(token,'hash1','admin',5000,2000),true);
    for (const args of [['hash2','admin',5000,2000],['hash1','community',5000,2000],['hash1','admin',5000,7000],['hash1','admin',5000,999]]) {
      assert.equal(session.verifySessionToken(token,...args),false);
    }
    assert.equal(session.verifySessionToken(token.slice(0,-5),'hash1','admin',5000,2000),false);
  });
  const access = load('src/lib/order-access.ts');
  await test('unsigned identity cookies cannot expose another order', async () => {
    jar.set('userEmail','victim@example.invalid'); jar.set('lastOrderId','foreign');
    assert.equal(await access.canReadOrder({ id:'foreign' }),false);
    await access.grantOrderAccess('own');
    assert.equal(await access.canReadOrder({ id:'own' }),true);
    assert.equal(await access.canReadOrder({ id:'foreign' }),false);
    jar.set('riwaya-order-foreign',jar.get('riwaya-order-own'));
    assert.equal(await access.canReadOrder({ id:'foreign' }),false);
  });
  await test('seller access is restricted to assigned orders', async () => {
    admin = { id:'seller',role:'SELLER' };
    assert.equal(await access.canReadOrder({ id:'other',sellerId:'different' }),false);
    assert.equal(await access.canReadOrder({ id:'other',sellerId:'seller' }),true);
    admin = null;
  });
  const jwt = require('jsonwebtoken'), mobile = load('src/lib/mobile-auth.ts');
  await test('mobile authentication rejects legacy tokens and revoked passwords', async () => {
    customer = { id:'c1', password:'hash', phone:'00000000', email:null };
    const request = token => new Request('https://example.invalid',{ headers:{ authorization:'Bearer '+token } });
    const token = jwt.sign({ id:'c1',role:'CUSTOMER',ver:mobile.mobilePasswordVersion('hash') },process.env.JWT_SECRET,{ audience:'mobile-customer',issuer:'riwaya' });
    assert.equal((await mobile.getMobileCustomer(request(token))).id,'c1');
    assert.equal(await mobile.getMobileCustomer(request(jwt.sign({ id:'c1',role:'CUSTOMER' },process.env.JWT_SECRET))),null);
    customer.password = 'changed';
    assert.equal(await mobile.getMobileCustomer(request(token)),null);
    customer = null;
  });
  const api = load('src/lib/api-authorization.ts');
  await test('password reset requires a signed one-use setup token', async () => {
    const file=fs.readFileSync(path.join(root,'src/lib/actions/auth.ts'),'utf8');
    const ast=ts.createSourceFile('auth.ts',file,ts.ScriptTarget.Latest,true);
    const fn=ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text==='resetPassword');
    const user={id:'setup-user',email:'user@example.invalid',password:'old-hash'};
    let writes=0;
    const context={exports:{},Buffer,console:{error(){}},jwt,crypto:require('node:crypto'),getJwtSecret:()=>process.env.JWT_SECRET,
      getAdminRole:async()=>null,bcrypt:{hash:async()=> 'new-hash'},createAuditLog:async()=>{},
      prisma:{user:{findUnique:async()=>({...user}),updateMany:async({where,data})=>{
        if(where.password!==user.password) return {count:0}; user.password=data.password; writes++; return {count:1};
      }}},
    };
    vm.runInNewContext(ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
    const reset=context.exports.resetPassword;
    assert.equal((await reset(user.email,'long-password-123')).success,false); assert.equal(writes,0);
    const token=jwt.sign({ver:require('node:crypto').createHash('sha256').update(user.password).digest('hex')},process.env.JWT_SECRET,{audience:'password-setup',subject:user.id,expiresIn:'24h'});
    assert.equal((await reset(user.email,'long-password-123',token)).success,true); assert.equal(writes,1);
    assert.equal((await reset(user.email,'another-password-123',token)).success,false); assert.equal(writes,1);
  });
  await test('every administrative HTTP handler rejects anonymous access before business logic', async () => {
    function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
    let checked=0;
    for (const filename of walk(path.join(root,'src/app/api/admin')).filter(p => /route\.ts$/.test(p))) {
      // Integration endpoint uses a separate API-secret header, not an admin cookie.
      if (filename.includes('customers-export')) continue;
      const source=fs.readFileSync(filename,'utf8');
      const ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true);
      for (const fn of ast.statements.filter(s => ts.isFunctionDeclaration(s) && /^(GET|POST|PUT|PATCH|DELETE)$/.test(s.name?.text || ''))) {
        const code=ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
        const context={exports:{},authorizeAdminApi:api.authorizeAdminApi};
        vm.runInNewContext(code,context);
        const response=await context.exports[fn.name.text](new Request('https://example.invalid'),{params:Promise.resolve({id:'foreign',filename:'private.pdf'})});
        assert.equal(response.status,401,filename+' '+fn.name.text);
        checked++;
      }
    }
    assert.ok(checked>=88, 'administrative endpoint coverage unexpectedly reduced');
    console.log('  '+checked+' actual administrative handlers exercised');
  });
  await test('admin APIs deny anonymous, customer and seller identities', async () => {
    assert.equal((await api.authorizeAdminApi()).status,401);
    for (const role of ['USER','SELLER','INFLUENCER']) {
      admin = { id:'x',role }; assert.equal((await api.authorizeAdminApi()).status,403);
    }
    admin = { id:'x',role:'ADMIN' }; assert.equal(await api.authorizeAdminApi(),null); admin=null;
  });
  await test('actual invoice handler denies customers even with their order grant', async () => {
    const source = fs.readFileSync(path.join(root,'src/app/api/orders/[orderId]/invoice/route.ts'),'utf8');
    const ast = ts.createSourceFile('route.ts',source,ts.ScriptTarget.Latest,true);
    const fn = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'GET');
    assert.ok(fn);
    const code = ts.transpileModule(fn.getText(ast),{ compilerOptions:{ module:ts.ModuleKind.CommonJS } }).outputText;
    const context = { exports:{}, authorizeAdminApi:api.authorizeAdminApi };
    vm.runInNewContext(code,context);
    const response = await context.exports.GET(new Request('https://example.invalid'),{ params:Promise.resolve({ orderId:'own' }) });
    assert.equal(response.status,401);
  });
  await test('replaying an exchange acceptance cannot issue credits twice', async () => {
    const filename=path.join(root,'src/app/api/mobile/exchange/requests/[id]/route.ts');
    const source=fs.readFileSync(filename,'utf8'), ast=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true);
    const fn=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='PUT');
    let state='PENDING',credits=0;
    const row={id:'exchange1',responderId:'customer1',requesterId:'customer2',type:'CREDIT',creditsAmount:10,bookRequestedId:'book1'};
    const tx={exchange:{updateMany:async({where,data})=>{
      if (where.status!==state) return {count:0}; state=data.status; return {count:1};
    },findUnique:async()=>({...row,status:state})},exchangeBook:{update:async()=>({})},customer:{update:async()=>{credits+=10;}}};
    const context={exports:{},console:{error(){}},NextResponse:Response,getCustomerId:async()=> 'customer1',prisma:{exchange:{findUnique:async()=>({...row,status:state})},$transaction:async fn=>fn(tx)}};
    vm.runInNewContext(ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
    const call=()=>context.exports.PUT(new Request('https://example.invalid',{method:'PUT',body:JSON.stringify({status:'ACCEPTED'})}),{params:Promise.resolve({id:row.id})});
    assert.equal((await call()).status,200); assert.equal(credits,10);
    assert.notEqual((await call()).status,200); assert.equal(credits,10);
  });
  await test('customer order projection omits internal costs, notes and digital URLs', () => {
    const {publicOrderSelect}=load('src/lib/public-order.ts');
    const fields=JSON.stringify(publicOrderSelect);
    assert.ok(!/costPrice|password|pdfUrl|deliveryLabel|staffNote/.test(fields));
    assert.equal(publicOrderSelect.statusHistory.select.comment,undefined);
    for (const filename of ['src/app/[locale]/checkout/success/[orderId]/page.tsx','src/app/[locale]/track/[orderId]/OrderTrackingClient.tsx']) {
      assert.ok(!/downloadInvoice|downloadOrderInvoicePdf|\/invoice/.test(fs.readFileSync(path.join(root,filename),'utf8')));
    }
  });
  const { privateFilePath } = load('src/lib/private-file-path.ts');
  await test('private documents reject traversal and absolute paths', () => {
    for (const input of ['..','../secret','..\\secret','/etc/passwd','C:\\secret','file\u0000.pdf']) assert.equal(privateFilePath(root,input),null);
    assert.equal(privateFilePath(root,'valid.pdf'),path.join(root,'valid.pdf'));
  });
  const security = load('src/lib/security.ts');
  await test('checkout ignores client prices and rejects unknown catalogue items', async () => {
    const db=fixtures['@/lib/prisma'].prisma;
    db.book={findMany:async()=>[{id:'book1',price:120}]};
    for (const name of ['pack','extraProduct','digitalProduct','gift']) db[name]={findMany:async()=>[]};
    db.coupon={findUnique:async()=>({isActive:true,type:'PERCENTAGE',discount:10,minAmount:0,expiresAt:null})};
    const pricing=load('src/lib/checkout-pricing.ts');
    const lines=await pricing.priceCheckoutItems([{productId:'book1',type:'BOOK',quantity:2,price:0.01}]);
    assert.equal(lines[0].price,120);
    await assert.rejects(()=>pricing.priceCheckoutItems([{productId:'unknown',type:'BOOK',quantity:1,price:1}]));
    assert.equal(await pricing.couponDiscount('TEST',240),24);
    db.coupon.findUnique=async()=>null;
    await assert.rejects(()=>pricing.couponDiscount('INVALID',240));
  });
  await test('image proxy rejects internal and reserved network addresses', () => {
    const {isPublicIPv4}=load('src/lib/public-image-fetch.ts');
    for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','0177.0.0.1']) assert.equal(isPublicIPv4(ip),false,ip);
    assert.equal(isPublicIPv4('8.8.8.8'),true);
  });
  await test('rich HTML removes scripts, events, SVG and javascript links', () => {
    const html = security.sanitizeHtml('<p>Text<strong>bold</strong><img src="https://example.invalid/a.png" onerror="alert(1)"><script>alert(2)</script><svg onload="alert(3)"></svg><a href="javascript:alert(4)">link</a></p>');
    assert.ok(html.includes('<strong>bold</strong>'));
    assert.ok(!/onerror|onload|<script|<svg|javascript:/i.test(html));
  });
  const { readJsonBody } = load('src/lib/request-body.ts');
  await test('body limits apply to declared and streamed data', async () => {
    assert.deepEqual(await readJsonBody(new Request('https://example.invalid',{ method:'POST',body:'{"a":1}' })),{ a:1 });
    await assert.rejects(() => readJsonBody(new Request('https://example.invalid',{ method:'POST',body:'123456' }),3));
    await assert.rejects(() => readJsonBody(new Request('https://example.invalid',{ method:'POST',headers:{'content-length':'999'},body:'{}' }),3));
  });
  await test('production refuses an absent or short signing key', () => {
    const oldEnv=process.env.NODE_ENV, key=process.env.JWT_SECRET;
    try { process.env.NODE_ENV='production'; process.env.JWT_SECRET='short'; assert.throws(() => load('src/lib/jwt-secret.ts').getJwtSecret()); }
    finally { process.env.JWT_SECRET=key; if (oldEnv===undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV=oldEnv; }
  });
  console.log(`${count} security scenarios passed`);
}
main().catch(error => { console.error(error); process.exitCode=1; });
