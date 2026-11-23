# Cron VPS — changements de statut Jumia

La route `/api/cron/jumia-status-changes` consulte les commandes Jumia mises à jour pendant les 89 derniers jours, parcourt toutes les pages et envoie un message Telegram pour chaque changement de statut.

La première exécution crée un état de référence sans envoyer d'anciennes notifications.

## Installation sur le VPS

Après déploiement de l'application :

```bash
chmod +x /var/www/tekno/scripts/jumia-status-cron.sh
sudo mkdir -p /var/log/tekno
sudo touch /var/log/tekno/jumia-status-cron.log
sudo chown "$(id -un):$(id -gn)" /var/log/tekno/jumia-status-cron.log
crontab -e
```

Ajouter cette ligne pour vérifier les statuts toutes les 10 minutes :

```cron
*/10 * * * * flock -n /tmp/tekno-jumia-status.lock /var/www/tekno/scripts/jumia-status-cron.sh >> /var/log/tekno/jumia-status-cron.log 2>&1
```

Le fichier `/var/www/tekno/.env` doit contenir `CRON_SECRET`. La configuration Jumia et Telegram déjà utilisée par l'administration Tekno Store doit également être active.

Test manuel :

```bash
/var/www/tekno/scripts/jumia-status-cron.sh
```

Réponse attendue à la première exécution : `"initialized":true`. Les exécutions suivantes indiquent `changedCount`.

Si le chemin ou le domaine diffère, définir `TEKNO_ENV_FILE` et/ou `TEKNO_APP_URL` directement dans le crontab.
