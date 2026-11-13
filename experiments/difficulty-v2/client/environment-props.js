// Collision footprint and visible size share one specification.
export const PROP_TYPES=['stump','hay','rock','feed'];
export const PROP_SPECS={
 stump:{name:'Пень',radius:39,variation:10,drawScale:2.5},
 hay:{name:'Сено',radius:45,variation:12,drawScale:2.6},
 rock:{name:'Камни',radius:49,variation:13,drawScale:2.45},
 feed:{name:'Кормушка',radius:29,variation:7,drawScale:2.7}
};
export function propIndex(o){return PROP_TYPES.indexOf(o.type)*3+(o.variant||1);}
export function propFile(o,ruined=false){return (ruined?'ruined':'normal')+'-'+String(propIndex(o)).padStart(2,'0')+'.webp';}
