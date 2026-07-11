import json

with open('n8n-workflow-riwaya.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# The new node
split_node = {
  "parameters": {
    "operation": "splitOutItems",
    "fieldToSplitOut": "batch",
    "options": {}
  },
  "id": "split-batch-node",
  "name": "Split Batch",
  "type": "n8n-nodes-base.itemLists",
  "typeVersion": 3,
  "position": [
    320,
    300
  ]
}

# Add node
d['nodes'].append(split_node)

# Re-wire connections
# Webhook previously connected to 'If Schedule?'
old_connections = d['connections'].get('Webhook', {'main': [[]]})

# Webhook connects to Split Batch
d['connections']['Webhook'] = {
    "main": [
        [
            {
                "node": "Split Batch",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# Split Batch connects to what Webhook was connected to
d['connections']['Split Batch'] = old_connections

with open('n8n-workflow-riwaya.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
