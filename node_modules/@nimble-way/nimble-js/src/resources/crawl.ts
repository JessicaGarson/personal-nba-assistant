// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../core/resource';
import * as Shared from './shared';
import { APIPromise } from '../core/api-promise';
import { RequestOptions } from '../internal/request-options';
import { path } from '../internal/utils/path';

export class Crawl extends APIResource {
  /**
   * Crawl by Filter
   *
   * @example
   * ```ts
   * const crawls = await client.crawl.list();
   * ```
   */
  list(
    query: CrawlListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<CrawlListResponse> {
    return this._client.get('/v1/crawl', { query, ...options });
  }

  /**
   * Create crawl task
   *
   * @example
   * ```ts
   * const response = await client.crawl.run({ url: 'url' });
   * ```
   */
  run(body: CrawlRunParams, options?: RequestOptions): APIPromise<CrawlRunResponse> {
    return this._client.post('/v1/crawl', { body, ...options });
  }

  /**
   * Get crawl data
   *
   * @example
   * ```ts
   * const response = await client.crawl.status(
   *   '123e4567-e89b-12d3-a456-426614174000',
   * );
   * ```
   */
  status(id: string, options?: RequestOptions): APIPromise<CrawlStatusResponse> {
    return this._client.get(path`/v1/crawl/${id}`, options);
  }

  /**
   * Cancel Crawl
   *
   * @example
   * ```ts
   * const response = await client.crawl.terminate(
   *   '123e4567-e89b-12d3-a456-426614174000',
   * );
   * ```
   */
  terminate(id: string, options?: RequestOptions): APIPromise<CrawlTerminateResponse> {
    return this._client.delete(path`/v1/crawl/${id}`, options);
  }
}

/**
 * Successful get crawl response
 */
export interface CrawlListResponse {
  data: Array<CrawlListResponse.Data>;

  pagination: CrawlListResponse.Pagination;
}

export namespace CrawlListResponse {
  /**
   * Crawl API response
   */
  export interface Data {
    account_name: string;

    crawl_id: string;

    crawl_options: Data.CrawlOptions;

    created_at: string | { [key: string]: unknown };

    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

    updated_at: string | { [key: string]: unknown };

    url: string;

    completed?: number;

    completed_at?: string | { [key: string]: unknown } | null;

    extract_options?: { [key: string]: unknown } | null;

    failed?: number;

    name?: string | null;

    pending?: number;

    tasks?: Array<Data.Task>;

    total?: number;
  }

  export namespace Data {
    export interface CrawlOptions {
      allow_external_links: boolean;

      allow_subdomains: boolean;

      crawl_entire_domain: boolean;

      ignore_query_parameters: boolean;

      limit: number;

      max_discovery_depth: number;

      sitemap: 'skip' | 'include' | 'only';

      callback?: CrawlOptions.UnionMember0 | string;

      exclude_paths?: Array<string>;

      include_paths?: Array<string>;

      [k: string]: unknown;
    }

    export namespace CrawlOptions {
      export interface UnionMember0 {
        url: string;

        events?: Array<'started' | 'page' | 'completed' | 'failed'>;

        headers?: { [key: string]: string };

        metadata?: { [key: string]: unknown };
      }
    }

    export interface Task {
      status: 'pending' | 'completed' | 'failed';

      task_id: string;

      created_at?: string;

      updated_at?: string;
    }
  }

  export interface Pagination {
    has_next: boolean;

    next_cursor?: string | null;

    total?: number;
  }
}

/**
 * Crawl API response
 */
export interface CrawlRunResponse {
  account_name: string;

  crawl_id: string;

  crawl_options: CrawlRunResponse.CrawlOptions;

  created_at: string | { [key: string]: unknown };

  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

  updated_at: string | { [key: string]: unknown };

  url: string;

  completed?: number;

  completed_at?: string | { [key: string]: unknown } | null;

  extract_options?: { [key: string]: unknown } | null;

  failed?: number;

  name?: string | null;

  pending?: number;

  tasks?: Array<CrawlRunResponse.Task>;

  total?: number;
}

export namespace CrawlRunResponse {
  export interface CrawlOptions {
    allow_external_links: boolean;

    allow_subdomains: boolean;

    crawl_entire_domain: boolean;

    ignore_query_parameters: boolean;

    limit: number;

    max_discovery_depth: number;

    sitemap: 'skip' | 'include' | 'only';

    callback?: CrawlOptions.UnionMember0 | string;

    exclude_paths?: Array<string>;

    include_paths?: Array<string>;

    [k: string]: unknown;
  }

  export namespace CrawlOptions {
    export interface UnionMember0 {
      url: string;

      events?: Array<'started' | 'page' | 'completed' | 'failed'>;

      headers?: { [key: string]: string };

      metadata?: { [key: string]: unknown };
    }
  }

  export interface Task {
    status: 'pending' | 'completed' | 'failed';

    task_id: string;

    created_at?: string;

    updated_at?: string;
  }
}

/**
 * Crawl API response
 */
export interface CrawlStatusResponse {
  account_name: string;

  crawl_id: string;

  crawl_options: CrawlStatusResponse.CrawlOptions;

  created_at: string | { [key: string]: unknown };

  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';

  updated_at: string | { [key: string]: unknown };

  url: string;

  completed?: number;

  completed_at?: string | { [key: string]: unknown } | null;

  extract_options?: { [key: string]: unknown } | null;

  failed?: number;

  name?: string | null;

  pending?: number;

  tasks?: Array<CrawlStatusResponse.Task>;

  total?: number;
}

export namespace CrawlStatusResponse {
  export interface CrawlOptions {
    allow_external_links: boolean;

    allow_subdomains: boolean;

    crawl_entire_domain: boolean;

    ignore_query_parameters: boolean;

    limit: number;

    max_discovery_depth: number;

    sitemap: 'skip' | 'include' | 'only';

    callback?: CrawlOptions.UnionMember0 | string;

    exclude_paths?: Array<string>;

    include_paths?: Array<string>;

    [k: string]: unknown;
  }

  export namespace CrawlOptions {
    export interface UnionMember0 {
      url: string;

      events?: Array<'started' | 'page' | 'completed' | 'failed'>;

      headers?: { [key: string]: string };

      metadata?: { [key: string]: unknown };
    }
  }

  export interface Task {
    status: 'pending' | 'completed' | 'failed';

    task_id: string;

    created_at?: string;

    updated_at?: string;
  }
}

export interface CrawlTerminateResponse {
  status: 'canceled';
}

export interface CrawlListParams {
  /**
   * Cursor for pagination.
   */
  cursor?: string | null;

  /**
   * Number of crawls to return per page.
   */
  limit?: number;

  /**
   * Filter crawls by their status.
   */
  status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled' | 'all';
}

export interface CrawlRunParams {
  /**
   * Url to crawl.
   */
  url: string;

  /**
   * Allows the crawler to follow links to external websites.
   */
  allow_external_links?: boolean;

  /**
   * Allows the crawler to follow links to subdomains of the main domain.
   */
  allow_subdomains?: boolean;

  /**
   * Webhook configuration for receiving crawl results.
   */
  callback?: CrawlRunParams.UnionMember0 | string;

  /**
   * Allows the crawler to follow internal links to sibling or parent URLs, not just
   * child paths.
   */
  crawl_entire_domain?: boolean;

  /**
   * URL pathname regex patterns that exclude matching URLs from the crawl.
   */
  exclude_paths?: Array<string>;

  extract_options?: CrawlRunParams.ExtractOptions;

  /**
   * Do not re-scrape the same path with different (or none) query parameters.
   */
  ignore_query_parameters?: boolean;

  /**
   * URL pathname regex patterns that include matching URLs in the crawl.
   */
  include_paths?: Array<string>;

  /**
   * Maximum number of pages to crawl.
   */
  limit?: number;

  /**
   * Maximum depth to crawl based on discovery order.
   */
  max_discovery_depth?: number;

  /**
   * Name of the crawl.
   */
  name?: string;

  /**
   * Sitemap and other methods will be used together to find URLs.
   */
  sitemap?: 'skip' | 'include' | 'only';
}

export namespace CrawlRunParams {
  export interface UnionMember0 {
    url: string;

    events?: Array<'started' | 'page' | 'completed' | 'failed'>;

    headers?: { [key: string]: string };

    metadata?: { [key: string]: unknown };
  }

  export interface ExtractOptions {
    /**
     * Browser type to emulate
     */
    browser?: 'chrome' | 'firefox' | ExtractOptions.UnionMember1;

    /**
     * Array of browser automation actions to execute sequentially
     */
    browser_actions?: Array<
      | Shared.AutoScrollAction
      | Shared.ClickAction
      | Shared.EvalAction
      | Shared.FetchAction
      | Shared.FillAction
      | Shared.GetCookiesAction
      | Shared.GotoAction
      | Shared.PressAction
      | Shared.ScreenshotAction
      | Shared.ScrollAction
      | Shared.WaitAction
      | Shared.WaitForElementAction
      | Shared.WaitForNavigationAction
    >;

    /**
     * City for geolocation
     */
    city?: string;

    /**
     * Whether to automatically handle cookie consent headers
     */
    consent_header?: boolean;

    /**
     * Browser cookies as array of cookie objects
     */
    cookies?: Array<ExtractOptions.UnionMember0> | string;

    /**
     * Country code for geolocation and proxy selection
     */
    country?:
      | 'AD'
      | 'AE'
      | 'AF'
      | 'AG'
      | 'AI'
      | 'AL'
      | 'AM'
      | 'AO'
      | 'AQ'
      | 'AR'
      | 'AS'
      | 'AT'
      | 'AU'
      | 'AW'
      | 'AX'
      | 'AZ'
      | 'BA'
      | 'BB'
      | 'BD'
      | 'BE'
      | 'BF'
      | 'BG'
      | 'BH'
      | 'BI'
      | 'BJ'
      | 'BL'
      | 'BM'
      | 'BN'
      | 'BO'
      | 'BQ'
      | 'BR'
      | 'BS'
      | 'BT'
      | 'BV'
      | 'BW'
      | 'BY'
      | 'BZ'
      | 'CA'
      | 'CC'
      | 'CD'
      | 'CF'
      | 'CG'
      | 'CH'
      | 'CI'
      | 'CK'
      | 'CL'
      | 'CM'
      | 'CN'
      | 'CO'
      | 'CR'
      | 'CU'
      | 'CV'
      | 'CW'
      | 'CX'
      | 'CY'
      | 'CZ'
      | 'DE'
      | 'DJ'
      | 'DK'
      | 'DM'
      | 'DO'
      | 'DZ'
      | 'EC'
      | 'EE'
      | 'EG'
      | 'EH'
      | 'ER'
      | 'ES'
      | 'ET'
      | 'FI'
      | 'FJ'
      | 'FK'
      | 'FM'
      | 'FO'
      | 'FR'
      | 'GA'
      | 'GB'
      | 'GD'
      | 'GE'
      | 'GF'
      | 'GG'
      | 'GH'
      | 'GI'
      | 'GL'
      | 'GM'
      | 'GN'
      | 'GP'
      | 'GQ'
      | 'GR'
      | 'GS'
      | 'GT'
      | 'GU'
      | 'GW'
      | 'GY'
      | 'HK'
      | 'HM'
      | 'HN'
      | 'HR'
      | 'HT'
      | 'HU'
      | 'ID'
      | 'IE'
      | 'IL'
      | 'IM'
      | 'IN'
      | 'IO'
      | 'IQ'
      | 'IR'
      | 'IS'
      | 'IT'
      | 'JE'
      | 'JM'
      | 'JO'
      | 'JP'
      | 'KE'
      | 'KG'
      | 'KH'
      | 'KI'
      | 'KM'
      | 'KN'
      | 'KP'
      | 'KR'
      | 'KW'
      | 'KY'
      | 'KZ'
      | 'LA'
      | 'LB'
      | 'LC'
      | 'LI'
      | 'LK'
      | 'LR'
      | 'LS'
      | 'LT'
      | 'LU'
      | 'LV'
      | 'LY'
      | 'MA'
      | 'MC'
      | 'MD'
      | 'ME'
      | 'MF'
      | 'MG'
      | 'MH'
      | 'MK'
      | 'ML'
      | 'MM'
      | 'MN'
      | 'MO'
      | 'MP'
      | 'MQ'
      | 'MR'
      | 'MS'
      | 'MT'
      | 'MU'
      | 'MV'
      | 'MW'
      | 'MX'
      | 'MY'
      | 'MZ'
      | 'NA'
      | 'NC'
      | 'NE'
      | 'NF'
      | 'NG'
      | 'NI'
      | 'NL'
      | 'NO'
      | 'NP'
      | 'NR'
      | 'NU'
      | 'NZ'
      | 'OM'
      | 'PA'
      | 'PE'
      | 'PF'
      | 'PG'
      | 'PH'
      | 'PK'
      | 'PL'
      | 'PM'
      | 'PN'
      | 'PR'
      | 'PS'
      | 'PT'
      | 'PW'
      | 'PY'
      | 'QA'
      | 'RE'
      | 'RO'
      | 'RS'
      | 'RU'
      | 'RW'
      | 'SA'
      | 'SB'
      | 'SC'
      | 'SD'
      | 'SE'
      | 'SG'
      | 'SH'
      | 'SI'
      | 'SJ'
      | 'SK'
      | 'SL'
      | 'SM'
      | 'SN'
      | 'SO'
      | 'SR'
      | 'SS'
      | 'ST'
      | 'SV'
      | 'SX'
      | 'SY'
      | 'SZ'
      | 'TC'
      | 'TD'
      | 'TF'
      | 'TG'
      | 'TH'
      | 'TJ'
      | 'TK'
      | 'TL'
      | 'TM'
      | 'TN'
      | 'TO'
      | 'TR'
      | 'TT'
      | 'TV'
      | 'TW'
      | 'TZ'
      | 'UA'
      | 'UG'
      | 'UM'
      | 'US'
      | 'UY'
      | 'UZ'
      | 'VA'
      | 'VC'
      | 'VE'
      | 'VG'
      | 'VI'
      | 'VN'
      | 'VU'
      | 'WF'
      | 'WS'
      | 'XK'
      | 'YE'
      | 'YT'
      | 'ZA'
      | 'ZM'
      | 'ZW'
      | 'ALL';

    /**
     * Device type for browser emulation
     */
    device?: 'desktop' | 'mobile' | 'tablet';

    /**
     * Browser driver to use
     */
    driver?: 'vx6' | 'vx8' | 'vx8-pro' | 'vx10' | 'vx10-pro' | 'vx12' | 'vx12-pro' | 'media-vx6';

    /**
     * Expected HTTP status codes for successful requests
     */
    expected_status_codes?: Array<number>;

    /**
     * List of acceptable response formats in order of preference
     */
    formats?: Array<'html' | 'markdown' | 'screenshot' | 'headers' | 'links'>;

    /**
     * Custom HTTP headers to include in the request
     */
    headers?: { [key: string]: string | Array<string> | null };

    /**
     * Whether to use HTTP/2 protocol
     */
    http2?: boolean;

    /**
     * Whether to emulate XMLHttpRequest behavior
     */
    is_xhr?: boolean;

    /**
     * Locale for browser language and region settings
     */
    locale?:
      | 'aa-DJ'
      | 'aa-ER'
      | 'aa-ET'
      | 'af'
      | 'af-NA'
      | 'af-ZA'
      | 'ak'
      | 'ak-GH'
      | 'am'
      | 'am-ET'
      | 'an-ES'
      | 'ar'
      | 'ar-AE'
      | 'ar-BH'
      | 'ar-DZ'
      | 'ar-EG'
      | 'ar-IN'
      | 'ar-IQ'
      | 'ar-JO'
      | 'ar-KW'
      | 'ar-LB'
      | 'ar-LY'
      | 'ar-MA'
      | 'ar-OM'
      | 'ar-QA'
      | 'ar-SA'
      | 'ar-SD'
      | 'ar-SY'
      | 'ar-TN'
      | 'ar-YE'
      | 'as'
      | 'as-IN'
      | 'asa'
      | 'asa-TZ'
      | 'ast-ES'
      | 'az'
      | 'az-AZ'
      | 'az-Cyrl'
      | 'az-Cyrl-AZ'
      | 'az-Latn'
      | 'az-Latn-AZ'
      | 'be'
      | 'be-BY'
      | 'bem'
      | 'bem-ZM'
      | 'ber-DZ'
      | 'ber-MA'
      | 'bez'
      | 'bez-TZ'
      | 'bg'
      | 'bg-BG'
      | 'bho-IN'
      | 'bm'
      | 'bm-ML'
      | 'bn'
      | 'bn-BD'
      | 'bn-IN'
      | 'bo'
      | 'bo-CN'
      | 'bo-IN'
      | 'br-FR'
      | 'brx-IN'
      | 'bs'
      | 'bs-BA'
      | 'byn-ER'
      | 'ca'
      | 'ca-AD'
      | 'ca-ES'
      | 'ca-FR'
      | 'ca-IT'
      | 'cgg'
      | 'cgg-UG'
      | 'chr'
      | 'chr-US'
      | 'crh-UA'
      | 'cs'
      | 'cs-CZ'
      | 'csb-PL'
      | 'cv-RU'
      | 'cy'
      | 'cy-GB'
      | 'da'
      | 'da-DK'
      | 'dav'
      | 'dav-KE'
      | 'de'
      | 'de-AT'
      | 'de-BE'
      | 'de-CH'
      | 'de-DE'
      | 'de-LI'
      | 'de-LU'
      | 'dv-MV'
      | 'dz-BT'
      | 'ebu'
      | 'ebu-KE'
      | 'ee'
      | 'ee-GH'
      | 'ee-TG'
      | 'el'
      | 'el-CY'
      | 'el-GR'
      | 'en'
      | 'en-AG'
      | 'en-AS'
      | 'en-AU'
      | 'en-BE'
      | 'en-BW'
      | 'en-BZ'
      | 'en-CA'
      | 'en-DK'
      | 'en-GB'
      | 'en-GU'
      | 'en-HK'
      | 'en-IE'
      | 'en-IN'
      | 'en-JM'
      | 'en-MH'
      | 'en-MP'
      | 'en-MT'
      | 'en-MU'
      | 'en-NA'
      | 'en-NG'
      | 'en-NZ'
      | 'en-PH'
      | 'en-PK'
      | 'en-SG'
      | 'en-TT'
      | 'en-UM'
      | 'en-US'
      | 'en-VI'
      | 'en-ZA'
      | 'en-ZM'
      | 'en-ZW'
      | 'eo'
      | 'es'
      | 'es-419'
      | 'es-AR'
      | 'es-BO'
      | 'es-CL'
      | 'es-CO'
      | 'es-CR'
      | 'es-CU'
      | 'es-DO'
      | 'es-EC'
      | 'es-ES'
      | 'es-GQ'
      | 'es-GT'
      | 'es-HN'
      | 'es-MX'
      | 'es-NI'
      | 'es-PA'
      | 'es-PE'
      | 'es-PR'
      | 'es-PY'
      | 'es-SV'
      | 'es-US'
      | 'es-UY'
      | 'es-VE'
      | 'et'
      | 'et-EE'
      | 'eu'
      | 'eu-ES'
      | 'fa'
      | 'fa-AF'
      | 'fa-IR'
      | 'ff'
      | 'ff-SN'
      | 'fi'
      | 'fi-FI'
      | 'fil'
      | 'fil-PH'
      | 'fo'
      | 'fo-FO'
      | 'fr'
      | 'fr-BE'
      | 'fr-BF'
      | 'fr-BI'
      | 'fr-BJ'
      | 'fr-BL'
      | 'fr-CA'
      | 'fr-CD'
      | 'fr-CF'
      | 'fr-CG'
      | 'fr-CH'
      | 'fr-CI'
      | 'fr-CM'
      | 'fr-DJ'
      | 'fr-FR'
      | 'fr-GA'
      | 'fr-GN'
      | 'fr-GP'
      | 'fr-GQ'
      | 'fr-KM'
      | 'fr-LU'
      | 'fr-MC'
      | 'fr-MF'
      | 'fr-MG'
      | 'fr-ML'
      | 'fr-MQ'
      | 'fr-NE'
      | 'fr-RE'
      | 'fr-RW'
      | 'fr-SN'
      | 'fr-TD'
      | 'fr-TG'
      | 'fur-IT'
      | 'fy-DE'
      | 'fy-NL'
      | 'ga'
      | 'ga-IE'
      | 'gd-GB'
      | 'gez-ER'
      | 'gez-ET'
      | 'gl'
      | 'gl-ES'
      | 'gsw'
      | 'gsw-CH'
      | 'gu'
      | 'gu-IN'
      | 'guz'
      | 'guz-KE'
      | 'gv'
      | 'gv-GB'
      | 'ha'
      | 'ha-Latn'
      | 'ha-Latn-GH'
      | 'ha-Latn-NE'
      | 'ha-Latn-NG'
      | 'ha-NG'
      | 'haw'
      | 'haw-US'
      | 'he'
      | 'he-IL'
      | 'hi'
      | 'hi-IN'
      | 'hne-IN'
      | 'hr'
      | 'hr-HR'
      | 'hsb-DE'
      | 'ht-HT'
      | 'hu'
      | 'hu-HU'
      | 'hy'
      | 'hy-AM'
      | 'id'
      | 'id-ID'
      | 'ig'
      | 'ig-NG'
      | 'ii'
      | 'ii-CN'
      | 'ik-CA'
      | 'is'
      | 'is-IS'
      | 'it'
      | 'it-CH'
      | 'it-IT'
      | 'iu-CA'
      | 'iw-IL'
      | 'ja'
      | 'ja-JP'
      | 'jmc'
      | 'jmc-TZ'
      | 'ka'
      | 'ka-GE'
      | 'kab'
      | 'kab-DZ'
      | 'kam'
      | 'kam-KE'
      | 'kde'
      | 'kde-TZ'
      | 'kea'
      | 'kea-CV'
      | 'khq'
      | 'khq-ML'
      | 'ki'
      | 'ki-KE'
      | 'kk'
      | 'kk-Cyrl'
      | 'kk-Cyrl-KZ'
      | 'kk-KZ'
      | 'kl'
      | 'kl-GL'
      | 'kln'
      | 'kln-KE'
      | 'km'
      | 'km-KH'
      | 'kn'
      | 'kn-IN'
      | 'ko'
      | 'ko-KR'
      | 'kok'
      | 'kok-IN'
      | 'ks-IN'
      | 'ku-TR'
      | 'kw'
      | 'kw-GB'
      | 'ky-KG'
      | 'lag'
      | 'lag-TZ'
      | 'lb-LU'
      | 'lg'
      | 'lg-UG'
      | 'li-BE'
      | 'li-NL'
      | 'lij-IT'
      | 'lo-LA'
      | 'lt'
      | 'lt-LT'
      | 'luo'
      | 'luo-KE'
      | 'luy'
      | 'luy-KE'
      | 'lv'
      | 'lv-LV'
      | 'mag-IN'
      | 'mai-IN'
      | 'mas'
      | 'mas-KE'
      | 'mas-TZ'
      | 'mer'
      | 'mer-KE'
      | 'mfe'
      | 'mfe-MU'
      | 'mg'
      | 'mg-MG'
      | 'mhr-RU'
      | 'mi-NZ'
      | 'mk'
      | 'mk-MK'
      | 'ml'
      | 'ml-IN'
      | 'mn-MN'
      | 'mr'
      | 'mr-IN'
      | 'ms'
      | 'ms-BN'
      | 'ms-MY'
      | 'mt'
      | 'mt-MT'
      | 'my'
      | 'my-MM'
      | 'nan-TW'
      | 'naq'
      | 'naq-NA'
      | 'nb'
      | 'nb-NO'
      | 'nd'
      | 'nd-ZW'
      | 'nds-DE'
      | 'nds-NL'
      | 'ne'
      | 'ne-IN'
      | 'ne-NP'
      | 'nl'
      | 'nl-AW'
      | 'nl-BE'
      | 'nl-NL'
      | 'nn'
      | 'nn-NO'
      | 'nr-ZA'
      | 'nso-ZA'
      | 'nyn'
      | 'nyn-UG'
      | 'oc-FR'
      | 'om'
      | 'om-ET'
      | 'om-KE'
      | 'or'
      | 'or-IN'
      | 'os-RU'
      | 'pa'
      | 'pa-Arab'
      | 'pa-Arab-PK'
      | 'pa-Guru'
      | 'pa-Guru-IN'
      | 'pa-IN'
      | 'pa-PK'
      | 'pap-AN'
      | 'pl'
      | 'pl-PL'
      | 'ps'
      | 'ps-AF'
      | 'pt'
      | 'pt-BR'
      | 'pt-GW'
      | 'pt-MZ'
      | 'pt-PT'
      | 'rm'
      | 'rm-CH'
      | 'ro'
      | 'ro-MD'
      | 'ro-RO'
      | 'rof'
      | 'rof-TZ'
      | 'ru'
      | 'ru-MD'
      | 'ru-RU'
      | 'ru-UA'
      | 'rw'
      | 'rw-RW'
      | 'rwk'
      | 'rwk-TZ'
      | 'sa-IN'
      | 'saq'
      | 'saq-KE'
      | 'sc-IT'
      | 'sd-IN'
      | 'se-NO'
      | 'seh'
      | 'seh-MZ'
      | 'ses'
      | 'ses-ML'
      | 'sg'
      | 'sg-CF'
      | 'shi'
      | 'shi-Latn'
      | 'shi-Latn-MA'
      | 'shi-Tfng'
      | 'shi-Tfng-MA'
      | 'shs-CA'
      | 'si'
      | 'si-LK'
      | 'sid-ET'
      | 'sk'
      | 'sk-SK'
      | 'sl'
      | 'sl-SI'
      | 'sn'
      | 'sn-ZW'
      | 'so'
      | 'so-DJ'
      | 'so-ET'
      | 'so-KE'
      | 'so-SO'
      | 'sq'
      | 'sq-AL'
      | 'sq-MK'
      | 'sr'
      | 'sr-Cyrl'
      | 'sr-Cyrl-BA'
      | 'sr-Cyrl-ME'
      | 'sr-Cyrl-RS'
      | 'sr-Latn'
      | 'sr-Latn-BA'
      | 'sr-Latn-ME'
      | 'sr-Latn-RS'
      | 'sr-ME'
      | 'sr-RS'
      | 'ss-ZA'
      | 'st-ZA'
      | 'sv'
      | 'sv-FI'
      | 'sv-SE'
      | 'sw'
      | 'sw-KE'
      | 'sw-TZ'
      | 'ta'
      | 'ta-IN'
      | 'ta-LK'
      | 'te'
      | 'te-IN'
      | 'teo'
      | 'teo-KE'
      | 'teo-UG'
      | 'tg-TJ'
      | 'th'
      | 'th-TH'
      | 'ti'
      | 'ti-ER'
      | 'ti-ET'
      | 'tig-ER'
      | 'tk-TM'
      | 'tl-PH'
      | 'tn-ZA'
      | 'to'
      | 'to-TO'
      | 'tr'
      | 'tr-CY'
      | 'tr-TR'
      | 'ts-ZA'
      | 'tt-RU'
      | 'tzm'
      | 'tzm-Latn'
      | 'tzm-Latn-MA'
      | 'ug-CN'
      | 'uk'
      | 'uk-UA'
      | 'unm-US'
      | 'ur'
      | 'ur-IN'
      | 'ur-PK'
      | 'uz'
      | 'uz-Arab'
      | 'uz-Arab-AF'
      | 'uz-Cyrl'
      | 'uz-Cyrl-UZ'
      | 'uz-Latn'
      | 'uz-Latn-UZ'
      | 'uz-UZ'
      | 've-ZA'
      | 'vi'
      | 'vi-VN'
      | 'vun'
      | 'vun-TZ'
      | 'wa-BE'
      | 'wae-CH'
      | 'wal-ET'
      | 'wo-SN'
      | 'xh-ZA'
      | 'xog'
      | 'xog-UG'
      | 'yi-US'
      | 'yo'
      | 'yo-NG'
      | 'yue-HK'
      | 'zh'
      | 'zh-CN'
      | 'zh-HK'
      | 'zh-Hans'
      | 'zh-Hans-CN'
      | 'zh-Hans-HK'
      | 'zh-Hans-MO'
      | 'zh-Hans-SG'
      | 'zh-Hant'
      | 'zh-Hant-HK'
      | 'zh-Hant-MO'
      | 'zh-Hant-TW'
      | 'zh-SG'
      | 'zh-TW'
      | 'zu'
      | 'zu-ZA'
      | 'auto';

    /**
     * Selects which markdown conversion strategy to use. "full_page" converts the
     * entire HTML page. "main_content" uses Mozilla Readability to extract the main
     * article content before converting.
     */
    markdown_backend?: 'full_page' | 'main_content';

    /**
     * HTTP method for the request
     */
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

    /**
     * Filters for capturing network traffic
     */
    network_capture?: Array<ExtractOptions.NetworkCapture>;

    /**
     * Operating system to emulate
     */
    os?: 'windows' | 'mac os' | 'linux' | 'android' | 'ios';

    /**
     * Whether to parse the response content
     */
    parse?: boolean;

    /**
     * Custom parser configuration as a key-value map
     */
    parser?: { [key: string]: unknown } | string;

    /**
     * Referrer policy for the request
     */
    referrer_type?:
      | 'random'
      | 'no-referer'
      | 'same-origin'
      | 'google'
      | 'bing'
      | 'facebook'
      | 'twitter'
      | 'instagram';

    /**
     * Whether to render JavaScript content using a browser
     */
    render?: boolean;

    /**
     * Request timeout in milliseconds
     */
    request_timeout?: number;

    session?: ExtractOptions.Session;

    /**
     * Skills or capabilities required for the request
     */
    skill?: string | Array<string>;

    /**
     * US state for geolocation (only valid when country is US)
     */
    state?:
      | 'AL'
      | 'AK'
      | 'AS'
      | 'AZ'
      | 'AR'
      | 'CA'
      | 'CO'
      | 'CT'
      | 'DE'
      | 'DC'
      | 'FL'
      | 'GA'
      | 'GU'
      | 'HI'
      | 'ID'
      | 'IL'
      | 'IN'
      | 'IA'
      | 'KS'
      | 'KY'
      | 'LA'
      | 'ME'
      | 'MD'
      | 'MA'
      | 'MI'
      | 'MN'
      | 'MS'
      | 'MO'
      | 'MT'
      | 'NE'
      | 'NV'
      | 'NH'
      | 'NJ'
      | 'NM'
      | 'NY'
      | 'NC'
      | 'ND'
      | 'MP'
      | 'OH'
      | 'OK'
      | 'OR'
      | 'PA'
      | 'PR'
      | 'RI'
      | 'SC'
      | 'SD'
      | 'TN'
      | 'TX'
      | 'UT'
      | 'VT'
      | 'VA'
      | 'VI'
      | 'WA'
      | 'WV'
      | 'WI'
      | 'WY';

    /**
     * User-defined tag for request identification
     */
    tag?: string;

    /**
     * Target URL to scrape
     */
    url?: string;
  }

  export namespace ExtractOptions {
    export interface UnionMember1 {
      name: 'chrome' | 'firefox';

      /**
       * Specific browser version to emulate
       */
      version?: string;
    }

    export interface UnionMember0 {
      creation?: string | null;

      domain?: string | null;

      expires?: string;

      extensions?: Array<string> | null;

      hostOnly?: boolean | null;

      httpOnly?: boolean | null;

      lastAccessed?: string | null;

      maxAge?: 'Infinity' | '-Infinity' | number | null;

      name?: string;

      path?: string | null;

      pathIsDefault?: boolean | null;

      sameSite?: 'strict' | 'lax' | 'none';

      secure?: boolean;

      value?: string;

      [k: string]: unknown;
    }

    export interface NetworkCapture {
      method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

      /**
       * Resource type for network capture filtering
       */
      resource_type?: string | Array<string>;

      status_code?: number | Array<number>;

      url?: NetworkCapture.URL;

      validation?: boolean;

      wait_for_requests_count?: number;

      wait_for_requests_count_timeout?: number;
    }

    export namespace NetworkCapture {
      export interface URL {
        value: string;

        type?: 'exact' | 'contains';
      }
    }

    export interface Session {
      id?: string;

      prefetch_userbrowser?: boolean;

      retry?: boolean;

      timeout?: number;
    }
  }
}

export declare namespace Crawl {
  export {
    type CrawlListResponse as CrawlListResponse,
    type CrawlRunResponse as CrawlRunResponse,
    type CrawlStatusResponse as CrawlStatusResponse,
    type CrawlTerminateResponse as CrawlTerminateResponse,
    type CrawlListParams as CrawlListParams,
    type CrawlRunParams as CrawlRunParams,
  };
}
