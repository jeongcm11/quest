const GRADES=[
 {n:'일반',p:50,t:['새싹 모험가','초보 학습자','작은 도전자','첫걸음']},
 {n:'고급',p:25,t:['꾸준한 노력가','성실한 탐험가','지식 수집가','목표 추적자']},
 {n:'희귀',p:15,t:['불굴의 의지','집중의 달인','지식의 탐구자','시간의 지배자']},
 {n:'영웅',p:7,t:['노력의 화신','무한한 가능성','지식의 수호자','한계를 넘은 자']},
 {n:'전설',p:2.5,t:['전설의 개척자','운명을 개척한 자','불멸의 의지','초월자']},
 {n:'신화',p:0.5,t:['현실의 지배자','절대적인 존재','무한의 초월자','선택받은 자']}
];
const COST=100, KEY='questlife_v1';
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
let S=JSON.parse(localStorage.getItem(KEY)||'null')||{nick:'모험가',bal:0,tot:0,quests:[],reads:[],owned:{},pulls:[],log:[],equip:null,id:1};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('저장 실패! 브라우저 저장공간을 확인하세요')}};
const need=l=>50+l*50;
function level(){let l=1,r=S.tot;while(r>=need(l)){r-=need(l);l++}return{l,r,n:need(l)}}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function addExp(n,why){
 const before=level().l;S.bal+=n;S.tot+=n;S.log.push({d:today(),n,why});
 const after=level().l;if(after>before){document.body.classList.add('flash');setTimeout(()=>document.body.classList.remove('flash'),1200);toast('🎉 레벨업! Lv.'+after)}
 else toast('+'+n+' EXP');
 save();render();
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const allTitles=()=>GRADES.flatMap((g,i)=>g.t.map(name=>({name,g:i})));

// 페이지 이동
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('nav button,.page').forEach(e=>e.classList.remove('on'));
 b.classList.add('on');$('#'+b.dataset.p).classList.add('on');
});
$('#nick').onchange=e=>{S.nick=e.target.value.trim()||'모험가';save()};

// 퀘스트
$('#qadd').onclick=()=>{
 const t=$('#qt').value.trim();if(!t)return toast('제목을 입력하세요');
 S.quests.push({id:S.id++,t,c:$('#qc').value,d:+$('#qd').value,k:$('#qk').value,done:null});
 $('#qt').value='';save();render();
};
function isDone(q){
 if(!q.done)return false;
 if(q.k==='daily')return q.done===today();
 if(q.k==='weekly'){return (Date.now()-new Date(q.done))<7*864e5}
 return true;
}
function doneQuest(id){
 const q=S.quests.find(x=>x.id===id);if(!q||isDone(q))return;
 q.done=today();addExp(q.d*10,q.t);
}
function delQuest(id){S.quests=S.quests.filter(q=>q.id!==id);save();render()}
function qRow(q){
 const d=isDone(q);
 return `<div class="row ${d?'done':''}"><span>[${q.c}·${{daily:'일일',weekly:'주간',long:'장기'}[q.k]}] ${esc(q.t)} <small>+${q.d*10} EXP</small></span>
 <span><button ${d?'disabled':''} onclick="doneQuest(${q.id})">완료</button><button onclick="delQuest(${q.id})">삭제</button></span></div>`;
}

// 독서 타이머 (경과 시간은 Date.now()로 계산)
let run=null,acc=0,tick=null,used=false;
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const elapsed=()=>acc+(run?Math.floor((Date.now()-run)/1000):0);
$('#rs').onclick=()=>{if(run)return;run=Date.now();tick=setInterval(()=>$('#clock').textContent=fmt(elapsed()),500)};
$('#rp').onclick=()=>{if(!run)return;acc=elapsed();run=null;clearInterval(tick)};
$('#re').onclick=()=>{
 const sec=elapsed();run=null;clearInterval(tick);acc=0;$('#clock').textContent='00:00';
 const min=Math.floor(sec/60);if(min<1)return toast('1분 이상 읽어야 보상이 있어요');
 const goal=+$('#goal').value||30;let exp=Math.floor(min/10)*10,bonus=min>=goal;if(bonus)exp+=20;
 S.reads.push({book:$('#book').value.trim()||'제목 없음',min,d:today()});
 if(exp>0)addExp(exp,'독서');else{save();render();toast('10분 미만이라 EXP 없음 (기록만 저장)')}
};

// 뽑기
function roll(){
 let r=Math.random()*100,g=0;
 for(;g<GRADES.length-1;g++){if(r<GRADES[g].p)break;r-=GRADES[g].p}
 const list=GRADES[g].t;return{name:list[Math.floor(Math.random()*list.length)],g};
}
function pull(n){
 if(S.bal<COST*n)return toast('EXP가 부족합니다');
 S.bal-=COST*n;S.log.push({d:today(),n:-COST*n,why:'뽑기'});
 const res=[];for(let i=0;i<n;i++){const t=roll();res.push(t);
  const dup=S.owned[t.name];S.owned[t.name]=(dup||0)+1;S.pulls.push({...t,d:today()})}
 $('#result').innerHTML=res.map((t,i)=>`<div class="t c${t.g}" style="animation-delay:${i*.15}s">${GRADES[t.g].n}<br><b>${t.name}</b>${S.owned[t.name]>1?'<small>(중복)</small>':'<small>NEW!</small>'}</div>`).join('');
 const top=Math.max(...res.map(t=>t.g));
 if(top===5){document.body.classList.add('flash');toast('🌈 신화 등급 획득!!!')}
 else if(top===4)toast('✨ 전설 등급 획득!');
 save();render();
}
$('#g1').onclick=()=>pull(1);$('#g10').onclick=()=>pull(10);

// 렌더링
function render(){
 const L=level();$('#lv').textContent=L.l;$('#expNow').textContent=L.r;$('#expNeed').textContent=L.n;
 $('#bar').style.width=(L.r/L.n*100)+'%';$('#bal').textContent=S.bal;$('#bal2').textContent=S.bal;$('#tot').textContent=S.tot;
 $('#nick').value=S.nick;$('#cost').textContent=COST;
 const t=$('#title');
 if(S.equip){const x=allTitles().find(a=>a.name===S.equip);t.textContent='『'+x.name+'』';t.className='ptitle c'+x.g}
 else{t.textContent='칭호 없음';t.className='ptitle'}
 const open=S.quests.filter(q=>!isDone(q));
 $('#todayList').innerHTML=S.quests.filter(q=>q.k!=='long'||!isDone(q)).map(qRow).join('')||'퀘스트 탭에서 첫 퀘스트를 만들어 보세요!';
 $('#qlist').innerHTML=S.quests.map(qRow).join('')||'퀘스트가 없습니다.';
 $('#rlog').innerHTML=S.reads.slice(-8).reverse().map(r=>`<div class="row"><span>${esc(r.book)}</span><span>${r.min}분 · ${r.d}</span></div>`).join('')||'기록 없음';
 const all=allTitles(),own=all.filter(a=>S.owned[a.name]).length,rate=Math.round(own/all.length*100)+'%';
 $('#rate').textContent='수집률 '+rate;$('#rate0').textContent=rate;
 $('#recent').innerHTML=S.pulls.slice(-3).reverse().map(p=>`<span class="c${p.g}">『${p.name}』</span> `).join('')||'아직 없음';
 $('#grid').innerHTML=all.map(a=>S.owned[a.name]
  ?`<div class="t c${a.g}" onclick="S.equip='${a.name}';save();render();toast('대표 칭호 장착!')">${GRADES[a.g].n}<br><b>${a.name}</b><small>${GRADES[a.g].p}% · x${S.owned[a.name]}</small></div>`
  :`<div class="t lock c${a.g}">???<small>${GRADES[a.g].n} ${GRADES[a.g].p}%</small></div>`).join('');
 $('#odds').textContent='확률: '+GRADES.map(g=>g.n+' '+g.p+'%').join(' / ')+' (중복 칭호는 도감에 횟수만 누적)';
 const best=S.pulls.length?GRADES[Math.max(...S.pulls.map(p=>p.g))].n:'-';
 const spent=-S.log.filter(l=>l.n<0).reduce((a,l)=>a+l.n,0);
 const mins=S.reads.reduce((a,r)=>a+r.min,0);
 const cnt=S.quests.filter(isDone).length;
 $('#statbox').innerHTML=[['레벨',L.l],['누적 EXP',S.tot],['보유 EXP',S.bal],['사용 EXP',spent],['완료 퀘스트',cnt],['누적 독서(분)',mins],['뽑기 횟수',S.pulls.length],['최고 등급',best],['수집률',rate]]
  .map(([a,b])=>`<div class="row"><span>${a}</span><b>${b}</b></div>`).join('');
}
render();
