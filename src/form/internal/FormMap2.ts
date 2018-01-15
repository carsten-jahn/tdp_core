import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';


export declare type IFormMultiMap = { [key: string]: any | any[] };


/**
 * Add specific options for input form elements
 */
export interface IFormMapDesc extends IFormElementDesc {
  badgeProvider(value: IFormRow[]): Promise<string> | string;

  entries: IFormElementDesc[];
  /**
   * whether an element can just be selected once
   */
  uniqueKeys: boolean;
  defaultSelection: boolean;
}

export interface IFormRow {
  key: string;
  value: any;
}

function hasInlineParent(node: HTMLElement) {
  while (node.parentElement) {
    node = node.parentElement;
    if (node.classList.contains('parameters')) {
      return node.classList.contains('form-inline');
    }
  }
  return false;
}

export default class FormMap2 extends AFormElement2<IFormMultiMap, IFormMapDesc> {

  private entries: IFormElementDesc[] = [];
  private readonly entryMap = new Map<string, IFormElementDesc>();

  private rows: AFormElement2<any, any>[] = [];

  private current: IFormMultiMap = {};

  protected defaultDesc() {
    const r = super.defaultDesc();
    r.badgeProvider = ()=>'';
    r.entries = [];
    r.uniqueKeys = false;
    r.defaultSelection = true;
    return r;
  }

  setEntries(entries: IFormElementDesc[]) {
    // TODO skip if the same value
    this.entries = entries;
    this.rows = [];
    this.value = {};
  }

  private compute() {
    if (!this.rows || this.rows.length === 0) {
      return {};
    }
    const map = new Map<string, any[]>();
    this.rows.forEach((row) => {
      if (!map.has(row.property)) {
        map.set(row.property, []);
      }
      const v = map.get(row.property);
      if (Array.isArray(row.value)) {
        v.push(...row.value);
      } else {
        v.push(row.value);
      }
    });
    const r: IFormMultiMap = {};
    map.forEach((v, k) => {
      if (v.length === 1) {
        r[k] = v[0];
      } else {
        r[k] = v;
      }
    });
    return r;
  }

  protected updateValue(v: IFormMultiMap) {
    // TODO map

    return v;
  }

  equal(a: IFormMultiMap, b: IFormMultiMap) {
    const akeys = Object.keys(a);
    const bkeys = Object.keys(b);
    if (akeys.length !== bkeys.length) {
      return false;
    }
    return akeys.every((key) => {
      const av = a[key];
      const bv = b[key];
      if (av !== bv) {
        return false;
      }
      if (!av || !bv) {
        return false;
      }
      const prop = this.rows.find((r) => r.property === key);
      return prop ? prop.equal(av, bv) : av === bv;
    });
  }
}
