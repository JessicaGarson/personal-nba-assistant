// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import type { Nimble } from '../client';

export abstract class APIResource {
  protected _client: Nimble;

  constructor(client: Nimble) {
    this._client = client;
  }
}
