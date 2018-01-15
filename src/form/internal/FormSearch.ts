import {IFormElementDesc} from '../interfaces';
import AFormElement2, {IFormElementExtras} from './AFormElement2';
import {ISelectOption} from './FormSelect';
import Select3, {equalArrays, ISelect3Options} from './Select3';


export declare type ISearchDesc = IFormElementDesc & ISelect3Options<ISelectOption>;


export default class FormSearch extends AFormElement2<ISelectOption[], ISearchDesc> {

  private readonly s: Select3<ISelectOption>;

  constructor(desc: Partial<ISearchDesc> & IFormElementExtras) {
    super(desc);
    this.s = new Select3(this.desc);
  }

  protected initImpl() {
    super.initImpl();
    this.node.appendChild(this.s.node);

    this.s.on(Select3.EVENT_SELECT, (_evt, value: ISelectOption[]) => {
      this.value = value;
    });
  }

  equal(a: ISelectOption[], b: ISelectOption[]) {
    return equalArrays(a, b);
  }

  protected updateValue(v: ISelectOption[]|null) {
    if (v == null) {
      v = [];
    }
    this.s.value = v!;
    return v;
  }
}
