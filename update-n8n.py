import json

with open('n8n-workflow-riwaya.json', 'r', encoding='utf-8') as f:
    data = f.read()

data = data.replace("$('Webhook').item.json.body", "$json.body")
data = data.replace('$("Webhook").item.json.body', "$json.body")
data = data.replace('$(\\"Webhook\\").item.json.body', "$json.body")

with open('n8n-workflow-riwaya.json', 'w', encoding='utf-8') as f:
    f.write(data)
