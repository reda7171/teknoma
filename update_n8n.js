const fs = require('fs')

const wf = JSON.parse(fs.readFileSync('c:/Users/HP/Desktop/riwaya/n8n-workflow-riwaya.json', 'utf8'))

const ifScheduleNode = {
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "id": "cond-has-schedule",
          "leftValue": "={{ $json.body.scheduleTime }}",
          "rightValue": "",
          "operator": {
            "type": "string",
            "operation": "notEmpty"
          }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  },
  "id": "if-schedule",
  "name": "If Schedule?",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "position": [ 400, 300 ]
};

const waitNode = {
  "parameters": {
    "resume": "dateTime",
    "dateTime": "={{ $json.body.scheduleTime }}"
  },
  "id": "wait-schedule",
  "name": "Wait Schedule",
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1,
  "position": [ 600, 200 ],
  "webhookId": "schedule-webhook"
};

wf.nodes.push(ifScheduleNode, waitNode);

const originalWebhookTargets = wf.connections["Webhook"]["main"][0];

wf.connections["Webhook"] = {
  "main": [
    [
      { "node": "If Schedule?", "type": "main", "index": 0 }
    ]
  ]
};

wf.connections["If Schedule?"] = {
  "main": [
    [
      { "node": "Wait Schedule", "type": "main", "index": 0 }
    ],
    originalWebhookTargets
  ]
};

wf.connections["Wait Schedule"] = {
  "main": [
    originalWebhookTargets
  ]
};

fs.writeFileSync('c:/Users/HP/Desktop/riwaya/n8n-workflow-riwaya.json', JSON.stringify(wf, null, 2))
console.log('done')
