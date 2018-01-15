import {IFormElement} from '../interfaces';
import {default as FormSelect, ISelectOption} from './FormSelect';

export interface IFormRule<T> {
  (value: T, elems: Map<keyof T, IFormElement<any>>): void;
}

export function showIf<T extends object>(property: keyof T, predicate: (value: T, elems: Map<keyof T, IFormElement<any>>)=>boolean): IFormRule<T> {
  return (value, elems) => {
    const elem = elems.get(property);
    if (!elem) {
      return;
    }
    elem.visible = predicate(value, elems);
  };
}

export function updateOptions<T extends object>(property: keyof T, updater: (value: T, elems: Map<keyof T, IFormElement<any>>)=>ISelectOption[]): IFormRule<T> {
  return (value, elems) => {
    const elem = elems.get(property);
    if (!elem || !(elem instanceof FormSelect)) {
      return;
    }
    elem.setOptions(updater(value, elems));
  };
}
