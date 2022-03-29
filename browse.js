const screenModels;

///////////////////
//INITIALIZATION//
/////////////////

for (let model of screenModels) {
  let models = document.createDocumentFragment(); 
  let filters = document.createDocumentFragment(); 
  let li = document.createElement('li'); 
  li.textContent = model.languagedetail_text;
  
  if (model.level === 3) {
    li.className = "filter"; 
    filters.appendChild(li); 
  }
  else {
    li.className = "model"; 
    models.appendChild(li); 
  }
  document.querySelector('#filters-dropdown').appendChild(filters);
  document.querySelector('#models').appendChild(models);
}

window.addEventListener('load', () => {
  //get screenmodels
  screenModelsButton.click();

  //wire event listeners
})