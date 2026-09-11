import { SidebarItem } from "@underlayerdev/ui";

/** Mobile drawer only: search lives in the navbar; Home/New/Profile live in the dock. Sign-out lives in the drawer footer, not this list. */
export type AppSidebarItem = SidebarItem & { url?: string };
export type SidebarItemMeta = Omit<AppSidebarItem, 'label'> & { translationKey: string };

const HOME_ITEM = {
  translationKey: 'common.home',
  value: 'home',
  url: '/home',
  leftIcons: ['home'],
};
const SETTINGS_ITEM = {
  translationKey: 'userMenu.settings',
  value: 'settings',
  url: '/settings',
  leftIcons: ['settings'],
};

export const PUBLIC_SIDEBAR_ITEMS: SidebarItemMeta[] = [HOME_ITEM];

export const PRIVATE_SIDEBAR_ITEMS: SidebarItemMeta[] = [HOME_ITEM, SETTINGS_ITEM];
