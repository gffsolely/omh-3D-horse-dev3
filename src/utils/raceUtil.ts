export const getTrackColor = (value) => {
  const valueStr = value.toString();
  if (valueStr === '1') {
    return '#FF3831';
  } else if (valueStr === '2') {
    return '#FF8A1B';
  } else if (valueStr === '3') {
    return '#FFE81D';
  } else if (valueStr === '4') {
    return '#21E084';
  } else if (valueStr === '5') {
    return '#24439E';
  } else if (valueStr === '6') {
    return '#12C4FF';
  } else if (valueStr === '7') {
    return '#5F32BE';
  } else if (valueStr === '8') {
    return '#901F1F';
  } else if (valueStr === '9') {
    return '#B1AE04';
  } else if (valueStr === '10') {
    return '#E85B8D';
  } else if (valueStr === '11') {
    return '#CB90E1';
  } else if (valueStr === '12') {
    return '#005FFF';
  } else {
    return '#ff0000';
  }
};
/**
 *  获取赛场类型
 * @param fieldId 赛场ID标识
 *
 * @returns Standard|Santa
 */
export const getFieldTypeByFieldId = (fieldId: string) => {
  if (!fieldId || fieldId.length <= 0) return 'Standard';
  const fieldModelList = [
    { fieldId: 'field_001', type: 'Standard', name: 'Standard Park' },
    { fieldId: 'field_002', type: 'Santa', name: 'Santa Anita 1m' },
    { fieldId: 'field_003', type: 'Santa', name: 'Santa Anita 1mlf' },
    { fieldId: 'field_004', type: 'Santa', name: 'Santa Anita 1m2f' },
    { fieldId: 'field_005', type: 'Santa', name: 'Santa Anita 1m4f' },
    { fieldId: 'field_006', type: 'Santa', name: 'Santa Anita 5f' },
    { fieldId: 'field_007', type: 'Santa', name: 'Santa Anita 6f' },
    { fieldId: 'field_008', type: 'Santa', name: 'Santa Anita 7f' },
    { fieldId: 'field_009', type: 'Santa', name: 'Santa Anita 1m110yds' },
    { fieldId: 'field_010', type: 'Standard', name: 'Standard Park 1000' },
    { fieldId: 'field_011', type: 'Standard', name: 'Standard Park 1200' },
    { fieldId: 'field_012', type: 'Standard', name: 'Standard Park 1400' },
    { fieldId: 'field_013', type: 'Standard', name: 'Standard Park 1800' },
    { fieldId: 'field_014', type: 'Standard', name: 'Standard Park 1900' },
  ];
  return fieldModelList.find((c) => c.fieldId === fieldId).type;
};
