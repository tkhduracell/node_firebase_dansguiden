import { config } from 'firebase-functions'

export type Secrets = {
  spotify: {
    client_id: string;
    client_secret: string;
  };
  firebase: {
    projectId: string;
    databaseURL: string;
    storageBucket: string;
    cloudResourceLocation: string;
  };
}

export class SecretsFactory {
  static init(): Secrets {
    return config() as Secrets
  }
}
