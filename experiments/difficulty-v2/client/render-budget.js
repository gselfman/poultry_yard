// Padding includes wings, boss windups and the full silhouette; never alter simulation.
export function visibleBody(e,view){const r=(e.r||20)*4+80;return e.x+r>=view.x&&e.x-r<=view.x+view.w&&e.y+r>=view.y&&e.y-r<=view.y+view.h;}
