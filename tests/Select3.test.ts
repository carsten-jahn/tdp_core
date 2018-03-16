/**
 * Created by Stefan Luger on 16.03.18
 */

/// <reference types="jasmine" />

import Select3, {IdTextPair, ISelect3Item, ISelect3Options} from '../src/form/internal/Select3';


describe('Select3', () => {
  const body: HTMLBodyElement = document.querySelector('body');
  let select3: Select3<IdTextPair>;

  beforeAll(() => {
    body.insertAdjacentHTML('afterbegin', `<div class="select3-test"></div>`);
    select3 = new Select3();
  });

  it('should be instantiated', () => {
    expect(select3 instanceof Select3);
  });

  it('should be added to the dom', () => {
    body.appendChild(select3.node);
    expect(body.classList.contains('select3'));
  });

  it('should have an empty array as default value', () => {
    expect(select3.value).toEqual([]);
  });

  it('should be open after focus', () => {
    expect(body.querySelector('.select2-container--open')).toBeNull();
    select3.focus();
    expect(body.querySelector('.select2-container--open')).not.toBeNull();
  });

});
