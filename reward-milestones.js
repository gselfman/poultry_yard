// Run ONLY against authoritative replay state in the host. This grants nothing.
export function rewardMilestones(state){const result=[];if(state.bossEvents?.guinea==='dead')result.push({milestone:'guinea-defeated',tier:'weak',unlock:'rambo'});if(state.bossEvents?.turkey==='dead')result.push({milestone:'turkey-defeated',tier:'main',unlock:'monk'});return result;}
