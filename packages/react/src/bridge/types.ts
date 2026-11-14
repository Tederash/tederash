import type {
  TederashProfile,
  ComponentAdaptations,
  DeepPartial,
  AnnouncementOptions,
} from "@tederash/core";

export type TederashBridgeRequestType =
  | "tederash:get_state"
  | "tederash:set_profile"
  | "tederash:update_pref"
  | "tederash:reset_profile"
  | "tederash:announce";

export interface TederashBridgeRequestDetail {
  id: string;
  type: TederashBridgeRequestType;
  payload?: {
    profile?: TederashProfile;
    patch?: DeepPartial<TederashProfile>;
    message?: string;
    priority?: "polite" | "assertive";
    options?: AnnouncementOptions;
    [key: string]: any;
  };
}

export interface TederashBridgeResponseDetail<T = any> {
  id: string;
  ok: boolean;
  data?: T;
  error?: string;
}

export interface TederashStateChangeDetail {
  profile: TederashProfile;
  adaptations: ComponentAdaptations;
}
