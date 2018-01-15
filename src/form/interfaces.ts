/**
 * Created by Samuel Gratzl on 08.03.2017.
 */


import {IEventHandler} from 'phovea_core/src/event';

export interface IFormElementDesc {
  /**
   * property for this element
   */
  property: string;
  /**
   * label or disable the label
   * @default id
   */
  label: string | false;
  /**
   * cache the value within the session for better user experience (true, false, true and cache key suffix)
   * @default true
   */
  cached: boolean|string;

  required: boolean;
}

/**
 * Describes public properties of a form element instance
 */
export interface IFormElement<T> extends IEventHandler {
  readonly desc: Readonly<IFormElementDesc>;
  /**
   * Unique identifier of the element within the form
   */
  readonly property: string;

  /**
   * Form element value
   */
  value: T;

  visible: boolean;

  /**
   * validates this field
   */
  validate(): boolean;

  /**
   * sets the focus to the element (e.g. opens a dropdown, etc.)
   */
  focus(): void;
}
