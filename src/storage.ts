/**
 * Created by Samuel Gratzl on 11.05.2016.
 */

import * as ajax from 'phovea_core/src/ajax';
import * as idtypes from 'phovea_core/src/idtype';
import * as ranges from 'phovea_core/src/range';
import * as session from 'phovea_core/src/session';

export interface INamedSet {
  /**
   * Id with random characters (generated when storing it on the server)
   */
  id?: string;

  /**
   * Filter name
   */
  name: string;

  /**
   * Filter description
   */
  description: string;

  /**
   * Creator name
   */
  creator: string;

  /**
   * idtype name to match the filter for an entry point
   */
  idType: string;

  /**
   * List of comma separated ids
   */
  ids: string;

  /**
   * Name of a categorical column (e.g., species)
   */
  subTypeKey: string;

  /**
   * Value of the categorical column (e.g., "Homo_sapiens" as value for species)
   */
  subTypeValue: string;

  /**
   * Use the subType value for the given key from the session
   */
  subTypeFromSession?: boolean;
}

export function listNamedSets(idType : idtypes.IDType | string = null):Promise<INamedSet[]> {
  const args = idType ? { idType : idtypes.resolve(idType).id} : {};
  return ajax.getAPIJSON('/targid/storage/namedsets/', args);
}

export function saveNamedSet(name: string, idType: idtypes.IDType|string, ids: ranges.RangeLike, subType: {key:string, value:string}, description = '') {
  const data:INamedSet = {
    name: name,
    creator: session.retrieve('username', 'Anonymous'),
    idType: idtypes.resolve(idType).id,
    ids: ranges.parse(ids).toString(),
    subTypeKey: subType.key,
    subTypeValue: subType.value,
    description: description
  };
  return ajax.sendAPI('/targid/storage/namedsets/', data, 'POST');
}

export function deleteNamedSet(id:string) {
  return ajax.sendAPI(`/targid/storage/namedset/${id}`, {}, 'DELETE');
}
