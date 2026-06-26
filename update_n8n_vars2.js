const fs = require('fs');
const data = JSON.parse(fs.readFileSync('c:/Users/HP/Desktop/riwaya/n8n-workflow-riwaya.json', 'utf8'));

const ifNode = data.nodes.find(n => n.name === 'If Schedule?');
if (ifNode) {
    ifNode.parameters.conditions.conditions[0].leftValue = "={{ $json.body.scheduleAt }}";
    if (ifNode.parameters.conditions.conditions[1]) {
        ifNode.parameters.conditions.conditions[1].leftValue = "={{ $json.body.scheduleAt }}";
    }
}

const waitNode = data.nodes.find(n => n.name === 'Wait Schedule');
if (waitNode) {
    waitNode.parameters.dateTime = "={{ $json.body.scheduleAt }}";
}

fs.writeFileSync('c:/Users/HP/Desktop/riwaya/n8n-workflow-riwaya.json', JSON.stringify(data, null, 2));
console.log('done');
