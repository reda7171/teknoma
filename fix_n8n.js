const fs = require("fs");
let wf = JSON.parse(fs.readFileSync("n8n-workflow-riwaya.json", "utf8"));

// 1. Fix Facebook condition
const fbNode = wf.nodes.find(n => n.name === "Facebook?");
fbNode.parameters.conditions.conditions = [
  {
    id: "cond-fb",
    leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
    rightValue: "facebook",
    operator: { type: "string", operation: "equals" }
  },
  {
    id: "cond-fb-both",
    leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
    rightValue: "both",
    operator: { type: "string", operation: "equals" }
  },
  {
    id: "cond-fb-all",
    leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
    rightValue: "all",
    operator: { type: "string", operation: "equals" }
  }
];
fbNode.parameters.conditions.combinator = "or";

// 2. Fix Instagram condition
const igNode = wf.nodes.find(n => n.name === "Instagram?");
igNode.parameters.conditions.conditions = [
  {
    id: "cond-ig",
    leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
    rightValue: "instagram",
    operator: { type: "string", operation: "equals" }
  },
  {
    id: "cond-ig-both",
    leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
    rightValue: "both",
    operator: { type: "string", operation: "equals" }
  },
  {
    id: "cond-ig-all",
    leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
    rightValue: "all",
    operator: { type: "string", operation: "equals" }
  }
];
igNode.parameters.conditions.combinator = "or";

// 3. Fix TikTok and Threads
const tkNode = wf.nodes.find(n => n.name === "TikTok?");
if (tkNode) {
  tkNode.parameters.conditions.conditions = [
    {
      id: "cond-tk",
      leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
      rightValue: "tiktok",
      operator: { type: "string", operation: "equals" }
    },
    {
      id: "cond-tk-all",
      leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
      rightValue: "all",
      operator: { type: "string", operation: "equals" }
    }
  ];
  tkNode.parameters.conditions.combinator = "or";
}

const thNode = wf.nodes.find(n => n.name === "Threads?");
if (thNode) {
  thNode.parameters.conditions.conditions = [
    {
      id: "cond-th",
      leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
      rightValue: "threads",
      operator: { type: "string", operation: "equals" }
    },
    {
      id: "cond-th-all",
      leftValue: "={{ $(\"Webhook\").item.json.body.platform }}",
      rightValue: "all",
      operator: { type: "string", operation: "equals" }
    }
  ];
  thNode.parameters.conditions.combinator = "or";
}

// 4. Add Réponse Programmé node
if (!wf.nodes.find(n => n.name === "Réponse Programmé")) {
    const respScheduled = {
      parameters: {
        respondWith: "json",
        responseBody: "={{ JSON.stringify({ success: true, message: \"Programmé avec succès dans n8n\", bookId: $(\"Webhook\").item.json.body.bookId }) }}",
        options: {}
      },
      id: "response-scheduled",
      name: "Réponse Programmé",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1,
      position: [500, 200]
    };
    wf.nodes.push(respScheduled);

    wf.connections["If Schedule?"].main[0][0].node = "Réponse Programmé";
    wf.connections["Réponse Programmé"] = {
      main: [
        [
          {
            node: "Wait Schedule",
            type: "main",
            index: 0
          }
        ]
      ]
    };
}

fs.writeFileSync("n8n-workflow-riwaya.json", JSON.stringify(wf, null, 2));
console.log("n8n workflow fixed");

