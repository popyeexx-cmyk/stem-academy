const $=id=>document.getElementById(id);
const today=new Date();today.setHours(0,0,0,0);
const isoDate=offset=>{const d=new Date(today);d.setDate(d.getDate()+offset);return d.toISOString().slice(0,10);};
const assignments=[
{id:1,title:"Measurement and SI units worksheet",grade:"9",due:isoDate(3),status:"Open",submitted:2,total:3,instructions:"Complete the measurement questions in your class notebook."},
{id:2,title:"Motion graphs practice",grade:"9",due:isoDate(-2),status:"Past due",submitted:1,total:3,instructions:"Draw and interpret the distance-time graph."},
{id:3,title:"Wave properties short questions",grade:"10",due:isoDate(5),status:"Open",submitted:2,total:3,instructions:"Answer the short questions discussed in class."}
];
const reviews=[
{title:"Measurement and SI units worksheet",className:"Grade 9 · Section A",count:"2 of 3 sample responses",status:"Awaiting review"},
{title:"Wave properties short questions",className:"Grade 10 · Section A",count:"2 of 3 sample responses",status:"Awaiting review"}
];
const classLabel=grade=>`Grade ${grade} · Section A`;
function makeCell(text,cls){const td=document.createElement("td");if(cls){const span=document.createElement("span");span.className=cls;span.textContent=text;td.append(span);}else td.textContent=text;return td;}
function makeStatus(status){const td=document.createElement("td"),pill=document.createElement("span");pill.className="status-pill"+(status==="Past due"?" status-overdue":status==="Draft"?" status-draft":"");pill.textContent=status;td.append(pill);return td;}
function render(){
 const query=$("searchInput").value.trim().toLowerCase(),grade=$("classFilter").value,status=$("statusFilter").value;
 const list=assignments.filter(a=>(a.title+" "+classLabel(a.grade)+" "+a.instructions).toLowerCase().includes(query)&&(grade==="all"||a.grade===grade)&&(status==="all"||a.status===status));
 const tbody=$("assignmentBody");tbody.replaceChildren();
 list.forEach(a=>{
  const tr=document.createElement("tr");
  tr.append(makeCell(a.title,"record-primary"),makeCell(classLabel(a.grade)),makeCell(new Date(a.due+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})),makeCell(`${a.submitted} / ${a.total} sample responses`),makeStatus(a.status));
  const action=document.createElement("td"),button=document.createElement("button");button.type="button";button.className="table-action";button.textContent="View";button.addEventListener("click",()=>showDetail(a));action.append(button);tr.append(action);tbody.append(tr);
 });
 if(!list.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.className="empty-row";td.textContent="No matching assignments. Try another filter.";tr.append(td);tbody.append(tr);}
 $("resultCount").textContent=`Showing ${list.length} of ${assignments.length} demo assignments`;
 $("totalCount").textContent=assignments.length;$("openCount").textContent=assignments.filter(a=>a.status==="Open").length;$("pastCount").textContent=assignments.filter(a=>a.status==="Past due").length;$("reviewCount").textContent=reviews.length;
}
function renderReviews(){
 const container=$("reviewItems");container.replaceChildren();
 reviews.forEach(item=>{const row=document.createElement("div");row.className="review-item";const marker=document.createElement("span");marker.className="review-marker";marker.textContent="✓";const text=document.createElement("div");text.className="review-copy";const strong=document.createElement("strong");strong.textContent=item.title;const small=document.createElement("small");small.textContent=item.className+" · "+item.count;text.append(strong,small);const status=document.createElement("span");status.className="review-status";status.textContent=item.status;row.append(marker,text,status);container.append(row);});
}
function showDetail(item){
 $("detailTitle").textContent=item.title;const container=$("detailContent");container.replaceChildren();
 const fields=[["Class",classLabel(item.grade)],["Due date",new Date(item.due+"T00:00:00").toLocaleDateString()],["Status",item.status],["Sample response progress",item.submitted+" of "+item.total],["Instructions",item.instructions||"No instructions entered."]];
 fields.forEach(([label,value])=>{const block=document.createElement("div");block.className="detail-field";const name=document.createElement("span");name.textContent=label;const content=document.createElement("p");content.textContent=value;block.append(name,content);container.append(block);});
 const note=document.createElement("p");note.className="detail-demo-note";note.textContent="This is demonstration content. There are no actual student submissions or stored records.";container.append(note);
 $("detailDialog").showModal();
}
function openCreate(){
 $("assignmentForm").reset();$("formFeedback").textContent="";$("assignmentDue").min=isoDate(0);$("assignmentDialog").showModal();$("assignmentTitle").focus();
}
$("createButton").addEventListener("click",openCreate);
$("closeDialog").addEventListener("click",()=>$("assignmentDialog").close());
$("cancelDialog").addEventListener("click",()=>$("assignmentDialog").close());
$("closeDetail").addEventListener("click",()=>$("detailDialog").close());
$("doneDetail").addEventListener("click",()=>$("detailDialog").close());
$("assignmentForm").addEventListener("submit",event=>{
 event.preventDefault();const title=$("assignmentTitle").value.trim(),due=$("assignmentDue").value;
 if(!title||!due){$("formFeedback").textContent="Enter an assignment title and due date.";return;}
 if(due<isoDate(0)){$("formFeedback").textContent="Choose today or a future due date.";return;}
 assignments.unshift({id:Date.now(),title,grade:$("assignmentClass").value,due,status:"Open",submitted:0,total:3,instructions:$("assignmentInstructions").value.trim()});
 $("assignmentDialog").close();render();
});
["searchInput","classFilter","statusFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",render));
$("menuButton").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
render();renderReviews();