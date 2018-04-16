/**
 * Created by Samuel Gratzl on 08.03.2017.
 */
import {IFormParent, IFormElementDesc, FormElementType} from '../interfaces';
import FormSelect from './FormSelect';
import FormSelect2 from './FormSelect2';
import FormInputText from './FormInputText';
import FormMap from './FormMap';
import FormButton from './FormButton';
import FormCheckBox from './FormCheckBox';
import FormSelect3 from './FormSelect3';
import FormRadio from './FormRadio';


export function create(parent: IFormParent, $parent: d3.Selection<any>, desc: IFormElementDesc) {
  switch (desc.type) {
    case FormElementType.SELECT:
      return new FormSelect(parent, $parent, desc);
    case FormElementType.SELECT2:
      return new FormSelect2(parent, $parent, desc);
    case FormElementType.SELECT2_MULTIPLE:
      return new FormSelect2(parent, $parent, desc, 'multiple');
    case FormElementType.SELECT3:
      return new FormSelect3(parent, $parent, desc);
    case FormElementType.SELECT3_MULTIPLE:
      return new FormSelect3(parent, $parent, desc, 'multiple');
    case FormElementType.INPUT_TEXT:
      return new FormInputText(parent, $parent, desc);
    case FormElementType.MAP:
      return new FormMap(parent, $parent, <any>desc);
    case FormElementType.BUTTON:
      return new FormButton(parent, $parent, <any>desc);
    case FormElementType.CHECKBOX:
      return new FormCheckBox(parent, $parent, <any>desc);
    case FormElementType.RADIO:
      return new FormRadio(parent, $parent, <any>desc);
    default:
      throw new Error('unknown form element type: ' + desc.type);
  }
}
