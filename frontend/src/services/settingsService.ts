import { api, apiGet, type ApiResponse } from "../lib/axios";

export interface OrgSetting {
  id: string;
  organization: string;
  settingKey: string;
  settingValue: any;
  createdAt: string;
  updatedAt: string;
}

/** Get all settings for an organisation */
export const getAllSettings = (org: string): Promise<OrgSetting[]> =>
  apiGet<OrgSetting[]>(`/settings/${org}`).then((res) => res.data);

/** Get a specific setting by key */
export const getSetting = (
  org: string,
  key: string,
): Promise<OrgSetting | null> =>
  apiGet<OrgSetting | null>(`/settings/${org}/${key}`).then((res) => res.data);

/** Create or update a single setting */
export const upsertSetting = (
  org: string,
  key: string,
  value: any,
): Promise<ApiResponse<OrgSetting>> =>
  api.put(`/settings/${org}/${key}`, { value }) as unknown as Promise<
    ApiResponse<OrgSetting>
  >;

/** Atomically upsert multiple settings */
export const bulkUpsertSettings = (
  org: string,
  settings: Array<{ key: string; value: any }>,
): Promise<ApiResponse<void>> =>
  api.put(`/settings/${org}/bulk`, {
    settings,
  }) as unknown as Promise<ApiResponse<void>>;

const settingsService = {
  getAllSettings,
  getSetting,
  upsertSetting,
  bulkUpsertSettings,
};

export default settingsService;
