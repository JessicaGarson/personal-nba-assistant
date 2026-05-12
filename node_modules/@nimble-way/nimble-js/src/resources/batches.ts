// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../core/resource';
import { APIPromise } from '../core/api-promise';
import { buildHeaders } from '../internal/headers';
import { RequestOptions } from '../internal/request-options';
import { path } from '../internal/utils/path';

export class Batches extends APIResource {
  /**
   * Retrieve a paginated list of batches for the authenticated account.
   */
  list(options?: RequestOptions): APIPromise<void> {
    return this._client.get('/v1/batches', {
      ...options,
      headers: buildHeaders([{ Accept: '*/*' }, options?.headers]),
    });
  }

  /**
   * Retrieve the details of a batch including all its tasks and completion status.
   */
  get(batchID: string, options?: RequestOptions): APIPromise<BatchGetResponse> {
    return this._client.get(path`/v1/batches/${batchID}`, options);
  }

  /**
   * Retrieve lightweight progress information for a batch without fetching all task
   * details.
   */
  progress(batchID: string, options?: RequestOptions): APIPromise<BatchProgressResponse> {
    return this._client.get(path`/v1/batches/${batchID}/progress`, options);
  }
}

/**
 * Response containing batch details with all tasks.
 */
export interface BatchGetResponse {
  /**
   * Unique identifier for the batch.
   */
  id: string;

  /**
   * Whether all tasks in the batch have finished.
   */
  completed: boolean;

  /**
   * Number of tasks that have completed so far.
   */
  completed_count: number;

  /**
   * ISO timestamp when the batch was created.
   */
  created_at: string;

  /**
   * Completion ratio between 0 and 1.
   */
  progress: number;

  status: 'success';

  /**
   * List of tasks in the batch.
   */
  tasks: Array<BatchGetResponse.Task | null>;

  /**
   * ISO timestamp when the batch completed.
   */
  completed_at?: string;
}

export namespace BatchGetResponse {
  export interface Task {
    /**
     * Unique task identifier.
     */
    id: string;

    _query: unknown;

    /**
     * Timestamp when the task was created.
     */
    created_at: string;

    /**
     * Original input data for the task.
     */
    input: unknown;

    /**
     * Current state of the task.
     */
    state: 'pending' | 'success' | 'error';

    /**
     * URL for checking the task status.
     */
    status_url: string;

    /**
     * Account name that owns the task.
     */
    account_name?: string;

    api_type?: 'web' | 'serp' | 'ecommerce' | 'social' | 'media' | 'agent' | 'extract';

    /**
     * Batch ID if this task is part of a batch.
     */
    batch_id?: string;

    /**
     * URL for downloading the task results.
     */
    download_url?: string;

    /**
     * Error message if the task failed.
     */
    error?: string;

    /**
     * Classification of the error type.
     */
    error_type?: string;

    /**
     * Timestamp when the task was last modified.
     */
    modified_at?: string;

    /**
     * Storage location of the output data.
     */
    output_url?: string;

    /**
     * HTTP status code from the task execution.
     */
    status_code?: number;
  }
}

/**
 * Lightweight batch progress without task details.
 */
export interface BatchProgressResponse {
  /**
   * Unique identifier for the batch.
   */
  id: string;

  /**
   * Whether all tasks in the batch have finished.
   */
  completed: boolean;

  /**
   * Number of tasks that have completed so far.
   */
  completed_count: number;

  /**
   * Completion ratio between 0 and 1.
   */
  progress: number;

  status: 'success';

  /**
   * ISO timestamp when the batch completed.
   */
  completed_at?: string;
}

export declare namespace Batches {
  export { type BatchGetResponse as BatchGetResponse, type BatchProgressResponse as BatchProgressResponse };
}
