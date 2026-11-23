// SPDX-License-Identifier: GPL-3.0-only
export const HEADER_GROUPS = ['control', 'primary', 'vt'];

/** Header presentation never mutates the readings which supply other card views. */
export function orderHeaderIcons(rows, order = []) {
  const rank = new Map(order.map((key, index) => [key, index]));
  return rows.map((row,index)=>({row,index})).sort((a,b)=>(rank.get(a.row.key)??order.length+a.index)-(rank.get(b.row.key)??order.length+b.index)).map(item=>item.row);
}

export function selectHeaderIcons(rows, config) {
  const hidden = new Set(config.header_icons?.hidden ?? []);
  const vt = new Set(config.vt_telemetry ?? []);
  return HEADER_GROUPS.flatMap(group=>orderHeaderIcons(rows.filter(row=>row.group===group),config.header_icons?.order)
    .filter(row=>row.headerEligible!==false && (group==='vt'?vt.has(row.vtKey):!hidden.has(row.key))));
}

export function setHeaderVisible(config, row, visible) {
  if (row.group==='vt') {
    const selected = new Set(config.vt_telemetry ?? []);
    visible?selected.add(row.vtKey):selected.delete(row.vtKey);
    return {...config,vt_telemetry:[...selected]};
  }
  const hidden = new Set(config.header_icons?.hidden ?? []);
  visible?hidden.delete(row.key):hidden.add(row.key);
  return {...config,header_icons:{...config.header_icons,hidden:[...hidden]}};
}

export function moveHeaderIcon(config, rows, key, offset) {
  const row=rows.find(item=>item.key===key);
  if(!row)return config;
  const keys=orderHeaderIcons(rows.filter(item=>item.group===row.group),config.header_icons?.order).map(item=>item.key);
  const from=keys.indexOf(key),to=from+offset;
  if(to<0||to>=keys.length)return config;
  keys.splice(from,1);keys.splice(to,0,key);
  // Keep metadata for temporarily absent sources and the other group.
  return {...config,header_icons:{...config.header_icons,order:[...(config.header_icons?.order??[]).filter(item=>!keys.includes(item)),...keys]}};
}
