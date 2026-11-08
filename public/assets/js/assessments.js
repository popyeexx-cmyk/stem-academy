const today = new Date();
const dateOffset = days => { const d = new Date(today); d.setDate(d.getDate()+days); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-"); };
const assessments = [
 {id:1,title:"Motion and Measurement Quiz",grade:"9",type:"Quiz",date:dateOffset(-12),total:20},
 {id:2,title:"Force and Laws of Motion Test",grade:"9",type:"Class test",date:dateOffset(-5),total:30},
 {id:3,title:"Waves Monthly Test",grade:"10",type:"Monthly test",date:dateOffset(-2),total:50}
];
const results = [
 {student:"Sample Student 01",assessmentId:1,grade:"9",marks:16},
 {student:"Sample Student 02",assessmentId:1,grade:"9",marks:13},
 {student:"Sample Student 03",assessmentId:1,grade:"9",marks:9},
 {student:"Sample Student 04",assessmentId:2,grade:"9",marks:24},
 {student:"Sample Student 05",assessmentId:2,grade:"9",marks:18},
 {student:"Sample Student 06",assessmentId:3,grade:"10",marks:38}
];
const $ = id => document.getElementById(id);
const state = {view:"assessments"};
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const assessmentFor = id => assessments.find(item => item.id === id);
const dateLabel = value => new Date(value+"T12:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
function updateStats(){
 $("assessmentCount").textContent=assessments.length;
 $("recordCount").textContent=results.length;
 const percentages=results.map(r=>r.marks/assessmentFor(r.assessmentId).total*100);
 $("averageScore").textContent=percentages.length?(percentages.reduce((a,b)=>a+b,0)/percentages.length).toFixed(1)+"%":"—";
 $("passCount").textContent=percentages.filter(p=>p>=50).length+" / "+percentages.length;
}
function filteredAssessments(){
 const q=$("searchInput").value.trim().toLowerCase(), grade=$("gradeFilter").value, type=$("typeFilter").value;
 return assessments.filter(a=>(grade==="all"||a.grade===grade)&&(type==="all"||a.type===type)&&(!q||(a.title+" "+a.type+" Grade "+a.grade).toLowerCase().includes(q)));
}
function filteredResults(){
 const q=$("searchInput").value.trim().toLowerCase(), grade=$("gradeFilter").value, type=$("typeFilter").value;
 return results.filter(r=>{const a=assessmentFor(r.assessmentId);return a&&(grade==="all"||r.grade===grade)&&(type==="all"||a.type===type)&&(!q||(r.student+" "+a.title+" "+a.type).toLowerCase().includes(q));});
}
function render(){
 const isAssessments=state.view==="assessments";
 $("assessmentView").hidden=!isAssessments; $("resultsView").hidden=isAssessments;
 $("assessmentsTab").classList.toggle("active",isAssessments); $("resultsTab").classList.toggle("active",!isAssessments);
 $("assessmentsTab").setAttribute("aria-selected",String(isAssessments)); $("resultsTab").setAttribute("aria-selected",String(!isAssessments));
 $("createAssessment").hidden=!isAssessments;
 if(isAssessments){
  const rows=filteredAssessments();
  $("assessmentBody").innerHTML=rows.length?rows.map(a=>`<tr><td><span class="record-primary">${escapeHTML(a.title)}</span><span class="record-secondary">Assessment #${a.id}</span></td><td>Grade ${a.grade} · Section A</td><td>${escapeHTML(a.type)}</td><td>${dateLabel(a.date)}</td><td>${a.total}</td><td><button class="table-action" type="button" data-detail="${a.id}">View</button></td></tr>`).join(""):'<tr><td colspan="6" class="empty-row">No matching assessments.</td></tr>';
  $("resultCount").textContent=`Showing ${rows.length} of ${assessments.length} assessments.`;
 }else{
  const rows=filteredResults();
  $("resultsBody").innerHTML=rows.length?rows.map(r=>{const a=assessmentFor(r.assessmentId),pct=r.marks/a.total*100;return `<tr><td><span class="record-primary">${escapeHTML(r.student)}</span></td><td>${escapeHTML(a.title)}</td><td>Grade ${r.grade}</td><td>${r.marks} / ${a.total}</td><td>${pct.toFixed(1)}%</td><td><span class="status-pill ${pct<50?"result-below":""}">${pct>=50?"At / above 50%":"Below 50%"}</span></td></tr>`;}).join(""):'<tr><td colspan="6" class="empty-row">No matching result records.</td></tr>';
  $("resultCount").textContent=`Showing ${rows.length} of ${results.length} sample result records.`;
 }
 updateStats();
}
function setView(view){state.view=view;$("searchInput").value="";render();}
$("assessmentsTab").addEventListener("click",()=>setView("assessments"));
$("resultsTab").addEventListener("click",()=>setView("results"));
["searchInput","gradeFilter","typeFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",render));
$("assessmentBody").addEventListener("click",event=>{const button=event.target.closest("[data-detail]");if(!button)return;const a=assessmentFor(Number(button.dataset.detail));if(!a)return;$("assessmentDetailTitle").textContent=a.title;$("assessmentDetailContent").innerHTML=`<div class="detail-field"><span>Class</span><p>Grade ${a.grade} · Section A</p></div><div class="detail-field"><span>Type</span><p>${escapeHTML(a.type)}</p></div><div class="detail-field"><span>Date</span><p>${dateLabel(a.date)}</p></div><div class="detail-field"><span>Total marks</span><p>${a.total}</p></div><div class="detail-demo-note">Demo record only. Mark entry, publication and student access are not connected.</div>`;$("assessmentDetailDialog").showModal();});
const dialog=$("assessmentDialog"), form=$("assessmentForm");
$("createAssessment").addEventListener("click",()=>{form.reset();$("assessmentDateInput").value=dateOffset(1);$("assessmentFeedback").textContent="";dialog.showModal();});
function closeCreate(){dialog.close();}
$("closeAssessmentDialog").addEventListener("click",closeCreate);$("cancelAssessmentDialog").addEventListener("click",closeCreate);
form.addEventListener("submit",event=>{event.preventDefault();const title=$("assessmentTitleInput").value.trim(),date=$("assessmentDateInput").value,total=Number($("assessmentMarksInput").value);if(!title||!date||!Number.isInteger(total)||total<1||total>1000){$("assessmentFeedback").textContent="Please check the title, date and total marks.";return;}assessments.unshift({id:Math.max(0,...assessments.map(a=>a.id))+1,title,grade:$("assessmentGradeInput").value,type:$("assessmentTypeInput").value,date,total});closeCreate();render();});
$("closeAssessmentDetail").addEventListener("click",()=>$("assessmentDetailDialog").close());
$("doneAssessmentDetail").addEventListener("click",()=>$("assessmentDetailDialog").close());
$("menuButton")?.addEventListener("click",()=>$("sidebar").classList.toggle("open"));
render();