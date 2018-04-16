/**
 * Find views for a given idtype and number of selected items.
 * The selected items itself are not considered in this function.
 * @param idtype
 * @param selection
 * @returns {any}
 */


import IDType from 'phovea_core/src/idtype/IDType';
import {IViewPluginDesc, matchLength, showAsSmallMultiple, toViewPluginDesc} from './interfaces';
import {
  EXTENSION_POINT_TDP_LIST_FILTERS, EXTENSION_POINT_TDP_INSTANT_VIEW,
  EXTENSION_POINT_TDP_VIEW, EXTENSION_POINT_TDP_VIEW_GROUPS, IGroupData, IInstanceViewExtensionDesc,
  IViewGroupExtensionDesc
} from '../extensions';
import {IPluginDesc, list as listPlugins} from 'phovea_core/src/plugin';
import Range from 'phovea_core/src/range/Range';
import {currentUser} from 'phovea_core/src/security';
import {resolveImmediately} from 'phovea_core/src';

export interface IDiscoveredView {
  enabled: boolean;
  v: IViewPluginDesc;
  disabledReason?: 'selection'|'security'|'invalid';
}

/**
 * finds for the given IDType and selection matching views
 * @param {IDType} idType the idtype to lookfor
 * @param {Range} selection the current input selection
 * @returns {Promise<IDiscoveredView[]>} list of views and whether the current selection count matches their requirements
 */
export default function findViews(idType: IDType, selection: Range): Promise<IDiscoveredView[]> {
  const selectionLength = selection.isNone ? 0 : selection.dim(0).length;

  function bySelection(p: any) {
    return (matchLength(p.selection, selectionLength) || (showAsSmallMultiple(p) && selectionLength > 1));
  }

  return findViewBase(idType, listPlugins(EXTENSION_POINT_TDP_VIEW), true).then((r) => {
    return r.map(toViewPluginDesc).map((v) => {
      const access = canAccess(v);
      const selection = bySelection(v);
      const hasAccessHint = !access && Boolean(v.securityNotAllowedText);
      return {
        enabled: access && selection,
        v,
        disabledReason: !access ? (hasAccessHint ? <'security'>'security' : <'invalid'>'invalid') : (!selection ? <'selection'>'selection': undefined)
      };
    }).filter((v) => v.disabledReason !== 'invalid');
  });
}

export function findAllViews(): Promise<IDiscoveredView[]> {
  return findViewBase(null, listPlugins(EXTENSION_POINT_TDP_VIEW), true).then((r) => {
    return r.map(toViewPluginDesc).map((v) => {
      const access = canAccess(v);
      const hasAccessHint = !access && Boolean(v.securityNotAllowedText);
      return {
        enabled: access,
        v,
        disabledReason: !access ? (hasAccessHint ? <'security'>'security' : <'invalid'>'invalid') : undefined
      };
    }).filter((v) => v.disabledReason !== 'invalid');
  });
}

async function findViewBase(idType: IDType | null, views: IPluginDesc[], hasSelection: boolean) {
  const byTypeChecker = async () => {
    const mappedTypes = await idType.getCanBeMappedTo();
    const all = [idType].concat(mappedTypes);

    return (p: any) => {
      const idType = p.idType !== undefined ? p.idType : p.idtype;
      const pattern = idType ? new RegExp(idType) : /.*/;
      return all.some((i) => pattern.test(i.id)) && (!hasSelection || (p.selection === 'any' || !matchLength(p.selection, 0)));
    };
  };

  const byType = idType ? await byTypeChecker() : () => true;


  // execute extension filters
  const filters = await Promise.all(listPlugins(EXTENSION_POINT_TDP_LIST_FILTERS).map((plugin) => plugin.load()));

  function extensionFilters(p: IPluginDesc) {
    const f = p.filter || {};
    return filters.every((filter) => filter.factory(f));
  }

  return views
    .filter((p) => byType(p) && extensionFilters(p))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

export function canAccess(p: any) {
  let security = p.security;
  if (security === undefined) {
    return true;
  }
  if (typeof security === 'string') {
    const role = security;
    security = (user) => user.roles.indexOf(role) >= 0;
  }
  if (typeof security === 'function') {
    const user = currentUser();
    if (!user) {
      return false;
    }
    return security(user);
  }
  return true;
}

export function findInstantViews(idType: IDType): Promise<IInstanceViewExtensionDesc[]> {
  return findViewBase(idType, listPlugins(EXTENSION_POINT_TDP_INSTANT_VIEW), false).then((r) => r.filter(canAccess));
}

function caseInsensitiveCompare(a: string, b: string) {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}

export function resolveGroupData() {
  const plugins = <IViewGroupExtensionDesc[]>listPlugins(EXTENSION_POINT_TDP_VIEW_GROUPS);
  const r = new Map<string, IGroupData>();
  plugins.forEach((plugin) => {
    (plugin.groups || []).forEach((g) => {
      g.label = g.label || g.name;
      g.description = g.description || '';
      r.set(g.name, g);
    });
  });
  return r;
}

export interface IGroupedViews<T extends {v: IViewPluginDesc}> extends IGroupData {
  views: T[];
}

/**
 * groups the given views
 * @param {T[]} views
 * @returns {IGroupedViews[]}
 */
export function groupByCategory<T extends {v: IViewPluginDesc}>(views: T[]): IGroupedViews<T>[] {
  const grouped = new Map<string, T[]>();
  views.forEach((elem) => {
    if (!grouped.has(elem.v.group.name)) {
      grouped.set(elem.v.group.name, [elem]);
    } else {
      grouped.get(elem.v.group.name).push(elem);
    }
  });

  const sortView = (a: {v: IViewPluginDesc}, b: {v: IViewPluginDesc}) => {
    const orderA = a.v.group.order;
    const orderB = b.v.group.order;
    if (orderA === orderB) {
      return caseInsensitiveCompare(a.v.name, b.v.name);
    }
    return orderA - orderB;
  };

  const sortGroup = (a: {name: string, order: number}, b: {name: string, order: number}) => {
    const orderA = a.order;
    const orderB = b.order;
    if (orderA === orderB) {
      return caseInsensitiveCompare(a.name, b.name);
    }
    return orderA - orderB;
  };

  const groupData = resolveGroupData();

  const groups = Array.from(grouped).map(([name, views]) => {
    let base = groupData.get(name);
    if (!base) {
      base = {name, label: name, description: '', order: 900};
    }
    return Object.assign(base, {views: views.sort(sortView)});
  });
  return groups.sort(sortGroup);
}
