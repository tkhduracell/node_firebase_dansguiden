# node_firebase_dansguiden
The backend of dansguiden using firebase cloud functions.

## Run locally
```
firebase experimental:functions:shell
```
Run the functions like normal javascript functions. E.g. `getVersions()`. Read more at https://firebase.google.com/docs/functions/local-emulator#install_and_configure_the_cloud_functions_shell

## Deploy cron
```
gcloud app deploy cron/app.yaml cron/cron.yaml
```

## Deploy functions
```
firebase deploy --only functions
```
