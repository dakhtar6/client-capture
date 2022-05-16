/* 
TODO
 - infinite scroll
 - gallery
 - blur photo
 - dropdowns
 - filters
 - see all
*/

////////////
//GLOBALS//
//////////

let hierarchies = [];
let hierarchiesLevelOne = [];
let hierarchiesLevelThree = [];
let storeName = '';
let filterData = {
  department: null,
  class: null,
  subclass: null,
  attribute3: null,
}
// const urlParams = new URLSearchParams(window.href.location);
// const store = urlParams.get('store');
const store = 511001; 

///////////////////
//INITIALIZATION//
/////////////////

// checkPermission();

window.addEventListener('load', () => {
  //get screenmodels
  // screenModelsButton.click();
  //getStores
  fetch('getStore.json')
  .then(response => response.json())
  .then(data => {
    storeName = data.result.stores[0].name;
    var storeNameElems = document.querySelectorAll('.store-name');
    for (var store of storeNameElems) {
      store.textContent = storeName; 
    }
  })
  .catch(error => {
    showErrorMessage(`Store name not returned - ${error}`)
  })
  //wire event listeners
  //search bar
  document.getElementById('search-bar').addEventListener('keyup', event => {
    if (document.getElementById('search-bar').value.trim() !== "" && event.code === 'Enter') {
      searchProducts(document.getElementById('search-bar').value); 
    }
  });
  //browse page
  document.querySelector('main').addEventListener('click', event => {
    let target = event.target; 
    //cards
    if(target.matches('.card-image')) {
      //department cards
      if (target.parentNode.className === "dept-card-button") {
        openCard(target); 
      }
      //product cards
      else if (target.parentNode.className === "product-card-button") {
        showProductDetail(target); 
      }
    }
    //breadcrumb
    if(target.matches('.crumb')) {
      let count = parseInt(target.dataset.count, 10); 
      let breadcrumbs = target.parentNode; 
      let page = target.closest('.page'); 
      let products = page.querySelector('.products');  
      let selectedProducts = page.querySelector(`.products .products-container[data-count="${count}"]`);  
      for (let j = 0; j < breadcrumbs.children.length; j++) {
        if (parseInt(breadcrumbs.children[j].dataset.count, 10) >= count) {
          //remove the other breadcrumbs that come after the crumb that was selected
          breadcrumbs.children[j].remove(); 
          j--;
          console.log("J", j); 
        }
      }
      for (let i = 0; i < products.children.length; i++) {
        //hide products that precede our selection
        if (parseInt(products.children[i].dataset.count, 10) < count) {
          products.children[i].classList.add('display-none'); 
        }
        //make that particular crumb's products appear
        if (parseInt(products.children[i].dataset.count, 10) === count) {
          page.querySelector('.page-title').textContent = (target.textContent.indexOf('>') > -1) ? `${target.textContent.slice(3)}` : `Browse Categories`; 
          products.children[i].classList.remove('display-none'); 
        }
        if (parseInt(products.children[i].dataset.count, 10) > count) {
          //get rid of products
          products.children[i].remove(); 
          i--;
          console.log("I", i); 
        }
      }
    }
    //back button
    if(target.matches('.back-button')) {
      target.closest('section').classList.add('slide-out'); 
    }
  });
  //error message
  document.getElementById('error-message-close-button').addEventListener('click', hideErrorMessage);
}); 

////////////////////
//DYNAMIC METHODS//
//////////////////

const showErrorMessage = message => {
  document.getElementById('error-message-text').textContent = message; 
  document.getElementById('error-message-container').classList.remove('display-none');
  document.getElementById('error-message-close-button').focus(); 
  console.error(message); 
}

const hideErrorMessage = () => {
  document.getElementById('error-message-container').classList.add('display-none');
}

const monetize = (num, currency) => {
  return new Intl.NumberFormat(window.navigator.language, { style: 'currency', currency: currency }).format(num); 
}

const extractName = str => {
  let name = ''; 
  for (let i = str.length - 1; i > 0; i--) {
    if (str[i] === ".") {
      break;
    }
    else {
      name = str[i] + name; 
    }
  }
  return name; 
}

const createCards = cardData => {
  let products = document.createDocumentFragment(); 
  //create card
	for (let data of cardData) {
    let card = document. createElement('div');
    card.className = "card"; 
    let imageContainer = document. createElement('div');
    imageContainer.className = "dept-card-image-container"; 
		let button = document.createElement('button');
    button.className = "dept-card-button";
    button.type = "button"; 
    button.dataset.id = data.id; 
    button.innerHTML = `<div class="card-image" style="background-image: url(${data.picture})" />`;
    let caption = document.createElement('p');
    caption.className = "product-caption"; 
    caption.textContent = data.descr;
    imageContainer.appendChild(button);
    card.appendChild(imageContainer); 
    card.appendChild(caption); 
    //if data has a price property it means we are making a card for an actual product and not a category / department
    if (data.hasOwnProperty('originalPrice')) {
      let originalPrice = document.createElement('p');
      originalPrice.className = "original-price";
      originalPrice.textContent = data.originalPrice;
      card.appendChild(originalPrice); 
      if (data.salePrice < data.originalPrice) {
        let salePrice = document.createElement('p');
        salePrice.className = "sale-price";
        salePrice.textContent = data.salePrice;
        card.children[2].classList.add('strike-through');
        card.insertBefore(salePrice, card.children[2]);
        console.log("CARD", card); 
      }
      card.dataset.venitem = data.venitem; 
      card.dataset.article = data.article; 
      card.children[0].className = 'product-card-image-container';
      card.children[0].children[0].className = 'product-card-button';
    }
    products.appendChild(card); 
	}
  return products; 
};

const openCard = card => {
  let page; 
  let  url;
  //todo - fix how to determine isFinalResult
  let isFinalResult = (card.parentNode.dataset.id < 5) ? false : true; 
  if (isFinalResult) {
    page = document.getElementById('final-products');
    url = `styleLookup.json`;
  }
  else {
    page = card.closest('.page');
    url = `itemHierarchy${card.parentNode.dataset.id}.json`; 
  }
  let products = page.querySelector('.products'); 
  //get new cards
  // let url = `itemHierarchy${card.parentNode.dataset.id}.json`; 
  fetch(url)
  .then(response => response.json())
  .then(data => {
    //create cards
    let cards = createCards(data.result.items || data.result.styles);
    let container = document.createElement('div'); 
    container.className = "products-container flex-container-row"; 
    container.dataset.count = page.querySelector('.products').children.length;  
    container.appendChild(cards); 
    //hide other products
    if (products) {
      for (let i = 0; i < products.children.length; i++) {
        products.children[i].classList.add('display-none');
      }
    }
    if (!isFinalResult) {
      //create breadcrumb
      let crumb = document.createElement('li');
      crumb.className = "crumb";
      crumb.dataset.count = page.querySelector('.breadcrumbs').children.length; 
      if (page.querySelector('.breadcrumbs').children.length > 0) {
        crumb.textContent = ` > ${page.querySelector('.page-title').textContent}`;
      }
      else {
        crumb.textContent = "Browse"; 
        crumb.addEventListener('click', () => {
          page.querySelector('.breadcrumbs').classList.add('hide'); 
          page.querySelector('.see-all-button').classList.add('hide'); 
          page.querySelector('.page-title').textContent = `Browse Categories`;
        })
      }
      page.querySelector('.breadcrumbs').appendChild(crumb); 
      //update title of page
      page.querySelector('.page-title').textContent = `${card.closest('.card').querySelector('.product-caption').textContent}`;
      page.querySelector('.breadcrumbs').classList.remove('hide'); //todo - only necessary for first time
      page.querySelector('.see-all-button').classList.remove('hide');
      //update see all button count
      page.querySelector('.see-all-count').textContent = ` (${data.result.totalCount})`;
      page.querySelector('.see-all-count').classList.remove('hide'); 
      //add cards
      products.appendChild(container); 
    }
    //the final result will get its own page
    else {
      page.querySelector('.products').innerHTML = ""; 
      products.appendChild(container); 
      page.querySelector('.page-title').textContent = `${card.closest('.card').querySelector('.product-caption').textContent} (${page.querySelector('.products-container').children.length})`
      page.querySelector('.filter-count').textContent = ` (${data.result.count})`;
      page.classList.remove('slide-out'); 
    }
  })
  .catch(error => {
    showErrorMessage(error);
  })
}

const showProductDetail = async (card) => {
  try {
    let style = await fetch('styleDetail.json').then(response => response.json()); 
    let product = await fetch('getProduct.json').then(response => response.json()); 
    let pricing = await fetch('getPricing.json').then(response => response.json()); 
    let inventory = await fetch('getInventory.json').then(response => response.json()); 
    //combine all our responses into one container
    let data = {...style.result, ...product.result, ...pricing.result, ...inventory.result}
    console.log('product data', data);
    //populate the product detail view 
    //images
    let imgUrl = card.style.backgroundImage;
    document.querySelector('.hero-header').style.backgroundImage = imgUrl; 
    document.querySelector('.single-product-images-container').style.backgroundImage = imgUrl; 
    document.getElementById('single-item-name').textContent = data.descr; 
    //details
    let liFrag = document.createDocumentFragment();
    let priceListItem = document.createElement('li');
    let salePrice = data.pricing.etran.lineItems[0].price.value; 
    let originalPrice = data.pricing.etran.lineItems[0].originalPrice.value; 
    let currency = data.pricing.etran.lineItems[0].originalPrice.currency; 
    if (salePrice < originalPrice) {
      priceListItem.innerHTML = `<span class="sale-price">${monetize(salePrice, currency)}</span><span class="strike-through color-grey">${monetize(originalPrice, currency)}</span> &#8226; `; //todo - internationalize
    }
    else {
      priceListItem.innerHTML = `<span>${originalPrice}</span> &#8226; `; //todo - internationalize
    }
    let stockListItem = document.createElement('li');
    let stock = data.inventory.stores[0].store[store].articles[0].onhand; 
    if (stock > 0) {
      stockListItem.textContent = `${stock} In Stock`;
      stockListItem.className = "color-green";
      stockListItem.style.marginLeft = "5px"; 
    }
    else if (stock === 0) {
      stockListItem.textContent = "Out of Stock!"; 
      stockListItem.className = "color-red";
    }
    liFrag.appendChild(priceListItem);
    liFrag.appendChild(stockListItem);
    document.getElementById('single-item-details').innerHTML = ""; 
    document.getElementById('single-item-details').appendChild(liFrag);
    //dropdowns
    let dropdownsFrag = document.createDocumentFragment(); 
    for (let dropdown of hierarchiesLevelThree) {
      let div = document.createElement('div');
      div.className = "dropdown-container flex-container-row"; 
      let label = document.createElement('label');
      label.textContent = dropdown.languagedetail_text; 
      label.setAttribute('for', extractName(dropdown.languagedetail_key)); 
      let select = document.createElement('select');
      select.id = extractName(dropdown.languagedetail_key);
      div.appendChild(label); 
      select.addEventListener('input', () => {
        for (item of itemHierarchy) {
          for (option in item) {
            if (option === this.id && option.id === this.value) {

            }
          }
        }
      })
      div.appendChild(select); 
      dropdownsFrag.appendChild(div); 
    }
    document.getElementById('single-item-dropdown-container').innerHTML = ""; 
    document.getElementById('single-item-dropdown-container').appendChild(dropdownsFrag); 
    //options 
    for (let item of data.itemHierarchy) {
      for (let key in item) {
        for (dropdown of hierarchiesLevelThree) {
          if (extractName(dropdown.languagedetail_key) === key) {
            let option = document.createElement('option'); 
            option.value = item[extractName(dropdown.languagedetail_key)].id;
            option.textContent = item[extractName(dropdown.languagedetail_key)].descr;
            //only add unique options don't add duplicates
            let optionCollection = document.getElementById(extractName(dropdown.languagedetail_key)).children; 
            if (optionCollection.length > 0) {
              let isUnique = true; 
              for (let i = 0; i < optionCollection.length; i++) {
                if (optionCollection[i].value === option.value) {
                  isUnique = false;
                  break; 
                }
              }
              if (isUnique) {
                document.getElementById(extractName(dropdown.languagedetail_key)).appendChild(option); 
              }
            } 
            else {
              document.getElementById(extractName(dropdown.languagedetail_key)).appendChild(option); 
            }
            break;
          }
        }
      }
    }
    document.getElementById('product-detail-view').classList.remove('slide-out'); 
  }
  catch(error) {
    showErrorMessage(error);
  }
}

const searchProducts = str => {
  str = str.trim();
  fetch('styleLookup.json')
  .then(response => response.json())
  .then(data => {
    let results = data.result.styles
    let cards = createCards(results);
    let container = document.createElement('div'); 
    container.className = "products-container flex-container-row"; 
    container.dataset.count = document.getElementById('search-results').querySelector('.products').children.length;  
    container.appendChild(cards); 
    document.querySelector('#search-results .products').innerHTML = ""; 
    document.querySelector('#search-results .products').appendChild(container);
    document.getElementById('search-results').classList.remove('slide-out'); 
  })
  .catch(error => {
    showErrorMessage(error); 
  })
}

///////////////////
//STATIC METHODS//
/////////////////

const getHierarchies = () => {
  fetch('screenmodel.json')
  .then(response => response.json())
  .then(data => {
    let filterCollection = document.createDocumentFragment(); 
    hierarchies = data.result.screenModels; 
    for (let hierarchy of  hierarchies) {
      //make filters
      let filter = document.createElement('li');
      filter.className = "filter";
      filter.textContent = hierarchy.languagedetail_text; 
      filter.dataset.type = extractName(hierarchy.componentkey); 
      filterCollection.appendChild(filter); 
      //separate product hierarchies 
      if (hierarchy.level === 1) {
        hierarchiesLevelOne.push(extractName(hierarchy.componentkey)); 
      }
      else if (hierarchy.level === 3) {
        hierarchiesLevelThree.push(hierarchy); 
      }
    }
    document.getElementById('filter-menu').appendChild(filterCollection); 
  })
  .then(() => {
    fetch('itemHierarchy0.json')
    .then(response => response.json())
    .then(data => {
      //make cards for browse screen
      let cards = createCards(data.result.items);
      let container = document.createElement('div'); 
      container.className = "products-container flex-container-row"; 
      container.dataset.count = 0;  
      container.appendChild(cards); 
      document.querySelector('#browse-page .products').appendChild(container); 
    })
    .catch(error => {
      showErrorMessage(error);
    })
  })
  .catch(error => {
    showErrorMessage(error);
  })
};

getHierarchies(); 