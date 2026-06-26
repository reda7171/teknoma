const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/HP/Desktop/riwaya/n8n-workflow-riwaya.json', 'utf8'));

const ifNode = data.nodes.find(n => n.name === 'If Schedule?');
if (ifNode) {
    ifNode.parameters.conditions.conditions = [{
        id: 'cond-has-schedule',
        leftValue: '={{ !!$json.body.scheduleAt }}',
        rightValue: true,
        operator: {
            type: 'boolean',
            operation: 'true',
            singleValue: true
        }
    }];
}

fs.writeFileSync('c:/Users/HP/Desktop/riwaya/n8n-workflow-riwaya.json', JSON.stringify(data, null, 2));
console.log('done');
