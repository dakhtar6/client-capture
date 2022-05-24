/* 
TODO
 - dropdowns
 - filters
 - infinite scroll
 - fix image size for gallery
 - see all


getProduct - article, media (always true)
getInventory - article
getPricing - assemble body below

{
 	localDateTime: localDateTime,
        store: storeNumber,
        transaction: {
        		lineItems: {
			sku: article,
			qty: 1,
			id: random num or string, 
			transactionRowId: 1
		}
	}
}

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
let productDetailCarousel; 
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
        showProductDetailPage(target); 
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
      if (target.closest('section').id === "product-detail-view") {
        productDetailCarousel.destroy(); 
      }
      target.closest('section').classList.add('slide-out'); 
    }
    //close backscreen
    if(target.matches('.backscreen')) {
      target.classList.add('display-none'); 
    }
    //close full size image
    if(target.matches('#close-image-button')) {
      document.getElementById('full-size-image-view').classList.add('slide-out');  
    }
    //single item dropdown option
    if(target.matches('.single-item-dropdown-option')) {
      if (target.classList.contains('color-grey')) {
        
      }
      else {
        const makeCalls = async () => {
          let article = target.dataset.article; 
          let fieldName = target.parentNode.dataset.id;
          let productDetailData = await fetchSingleProductData(); 
          if (productDetailData.constructor === Object) { //indicates succcessful response
            //update carousel
            updateProductDetailCarousel(productDetailData);
            //update details
            updateSingleProductDetails(productDetailData); 
            //update dropdowns
            assignSingleProductDropdownOptionStatus(productDetailData, target); 
          }
          else {
            showErrorMessage(productDetailData);
          }
        }
        makeCalls(); 
      }
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

const showSpinner = () => {
  let spinner = document.createElement('div');
  spinner.className = "spinner";
  spinner.innerHTML = "<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>"; 
  document.querySelector('#spinner').appendChild(spinner); 
  document.querySelector('#spinner-container').classList.remove('display-none'); 
};

const hideSpinner = () => {
  if (document.querySelector('#spinner .spinner')) {
    document.querySelector('#spinner .spinner').remove(); 
  }
  document.querySelector('#spinner-container').classList.add('display-none'); 
}; 

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

const updateProductDetailCarousel = (data, headerImgUrl) => {
  if (headerImgUrl) {
    document.querySelector('.hero-header').style.backgroundImage = headerImgUrl;
  }
  let slides = document.createDocumentFragment();
  let bullets = document.createDocumentFragment();
  let count= 0; 
  for (slideData of data.products[0].media) {
    let slide = document.createElement('li');
    slide.className = "glide__slide";
    //images
    if (slideData.type_am === "I" || slideData.type_am === "") {
      slide.innerHTML = `<div class="product-gallery-image" style="background-image: url(${slideData.url_am})" />`;
    }
    //video
    else if (slideData.type_am === "V") {
      slide.innerHTML = `<video controls class="product-gallery-video"><source src="${slideData.url_am})"></video>`;
    }
    slide.addEventListener('click', (event) => {
      document.getElementById('full-size-image-container').style.backgroundImage = event.target.style.backgroundImage;
      document.getElementById('full-size-image-view').classList.remove('slide-out');  
    });
    slides.appendChild(slide); 
    //create bullet
    let bullet = document.createElement('button');
    bullet.className = "glide__bullet";
    bullet.dataset.glideDir = `=${count}`; 
    bullets.appendChild(bullet); 
    count++; 
  }
  document.querySelector('#single-product-gallery-container .glide__slides').innerHTML = "";
  document.querySelector('#single-product-gallery-container .glide__slides').appendChild(slides);
  document.querySelector('#single-product-gallery-container .glide__bullets').innerHTML = "";
  document.querySelector('#single-product-gallery-container .glide__bullets').appendChild(bullets);
  productDetailCarousel = new Glide(".glide", {
    gap: 0,
    perView: 1,
    animationDuration: 300,
    type: "carousel"
  })
  productDetailCarousel.mount();
  const width = document.querySelector('#single-product-gallery-container .glide__slides .glide__slide').style.width.replace(/\D/g,''); 
  const height = width / 2; 
  console.log("W", width, "H", height); 
  let allSlides = document.querySelectorAll('#single-product-gallery-container .glide__slides .glide__slide');
  for (let i = 0; i < allSlides.length; i++) {
    allSlides[i].style.height = height; 
  }
}

const fetchSingleProductData = async () => {
  try {
    let style = await fetch('styleDetail2.json').then(response => response.json()); 
    let product = await fetch('getProduct.json').then(response => response.json()); 
    let pricing = await fetch('getPricing.json').then(response => response.json()); 
    let inventory = await fetch('getInventory.json').then(response => response.json()); 
    //combine all our responses into one container
    return data = {...style.result, ...product.result, ...pricing.result, ...inventory.result}
  }
  catch (error) {
    return error; 
  }
}

const updateSingleProductDetails = (data) => {
  //product name
  document.getElementById('single-item-name').textContent = data.descr; 
  //product price
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
  //amount in stock
  let stockListItem = document.createElement('li');
  let stock = data.inventory.stores[0].store[store].articles[0].onhand; 
  if (stock > 0) {
    stockListItem.textContent = `${stock} In Stock`;
    stockListItem.className = "color-green";
    stockListItem.style.marginLeft = "5px"; 
  }
  else {
    stockListItem.textContent = "Out of Stock!"; 
    stockListItem.className = "color-red";
  }
  //aapend to DOM
  liFrag.appendChild(priceListItem);
  liFrag.appendChild(stockListItem);
  document.getElementById('single-item-details').innerHTML = ""; 
  document.getElementById('single-item-details').appendChild(liFrag);
}

const assignSingleProductDropdownOptionStatus = (data, selectedDropdown) => {
  let selectedValue = selectedDropdown.dataset.value; 
  let selectedID = selectedDropdown.parentNode.id;
  let allDropdowns = document.querySelectorAll('#single-item-dropdown-container .floating-dropdown-container');
  //collect supported choices - not all product combinations are available
  let supported = {}; 
  for (let item of data.itemHierarchy) {
    for (let key in item) {
      if (key === selectedID && item[key].id === selectedValue) { //the supported combinations will have a key and id that match the user's choice
        for (let prop in item) {
          if (prop !== key) { //we don't want the values related to the dropdown that was selected 
            if (supported[prop]) {
              // supported[prop] = supported[prop].push(item[prop].id || item[prop]); - for some reason when the array is on an object, pushing overwrites the array entirely so we concat instead. 
              supported[prop] = supported[prop].concat(item[prop].id || item[prop]); 
              // console.log("FIRED", 'prop', prop, 'suppored[prop]', supported[prop], 'item[prop]', item[prop], 'supported', supported);
            }
            else {
              let arr = []; 
              arr.push(item[prop].id || item[prop]);
              supported[prop] = arr; 
              // console.log("FIRED222", 'prop', prop, 'suppored[prop]', supported[prop], 'item[prop]', item[prop], 'supported', supported);
            }
          }
        }
      }
    }
  }
  console.log("SUPPORTED", supported); 
  //if an option isn't included in the supported choices change its text to grey
  for (let dropdown = 0; dropdown < allDropdowns.length; dropdown++) {
    if (allDropdowns[dropdown].id !== selectedID) {
      for (let option = 0; option < allDropdowns[dropdown].children.length; option++) {
        if (supported[allDropdowns[dropdown].id].includes(!allDropdowns[dropdown].children[option].dataset.id)) {
          allDropdowns[dropdown].children[option].classList.add('color-grey'); 
        } 
        //remove any possible previous greyed out options
        else {
          allDropdowns[dropdown].children[option].classList.remove('color-grey'); 
        }
      }
    }
  }
  //add a checkmark to the selection
  let selectedDropdownOptions = selectedDropdown.parentNode.children; 
  for (let i = 0; i < selectedDropdownOptions.length; i++){
    if (selectedDropdownOptions[i].id === selectedID) {
      selectedDropdownOptions[i].classList.add('selected'); 
    }
    else {
      selectedDropdownOptions[i].classList.remove('selected'); 
    }
  }
  //display the selection 
  selectedDropdown.closest('.dropdown-container').querySelector('.selected-choice').textContent = selectedValue; 
  //make sure any currently selected dropdown choices in the other dropdowns are supported. If not remove their selection

  //close dropdown
  selectedDropdown.closest('.backscreen').click(); 
}

const createSingleProductDropdowns = (data, selectedArticle) => {
  let dropdownsFrag = document.createDocumentFragment(); 
  for (let dropdown of hierarchiesLevelThree) {
    //overall container
    let dropdownContainer = document.createElement('div');
    dropdownContainer.className = "dropdown-container flex-container-row"; 
    //label
    let label = document.createElement('label');
    label.textContent = dropdown.languagedetail_text; 
    label.setAttribute('for', extractName(dropdown.languagedetail_key)); 
    //holds the dropdown, dropdown's selected choice, and arrow
    let div = document.createElement('div');
    div.className = "arrow-container flex-container-row"; 
    //reveal the dropdown choices when clicked
    div.addEventListener('click', () => {
      console.log("THIS", div); 
      div.parentNode.querySelector('.backscreen').classList.remove('display-none');
    }); 
    let arrow = document.createElement('span');
    arrow.className = "right-arrow";
    arrow.innerHTML = "&#8250;";
    let span = document.createElement('span');
    span.className = "selected-choice";
    span.dataset.for = extractName(dropdown.languagedetail_key); 
    //dropdown - we use a <ul> instead of <select> because we need to do some customization that a <select> tag won't be able to support
    let backscreen = document.createElement('div');
    backscreen.className = "backscreen display-none"; 
    let select = document.createElement('ul');
    select.id = extractName(dropdown.languagedetail_key);
    select.className = "floating-dropdown-container"; 
    //append elements
    div.appendChild(span)
    div.appendChild(arrow); 
    backscreen.appendChild(select); 
    dropdownContainer.appendChild(label); 
    dropdownContainer.appendChild(div);
    dropdownContainer.appendChild(backscreen);
    dropdownsFrag.appendChild(dropdownContainer); 
  }
  document.getElementById('single-item-dropdown-container').innerHTML = ""; 
  document.getElementById('single-item-dropdown-container').appendChild(dropdownsFrag); 
  //options 
  for (let item of data.itemHierarchy) {
    for (let key in item) {
      for (dropdownData of hierarchiesLevelThree) {
        if (extractName(dropdownData.languagedetail_key) === key) {
          let dropdown = document.getElementById(extractName(dropdownData.languagedetail_key)); 
          //we use a <li> instead of <option> because we need to do some customization that an <option> tag won't be able to support
          let option = document.createElement('li'); 
          option.className = "single-item-dropdown-option"; 
          option.dataset.value = item[extractName(dropdownData.languagedetail_key)].id;
          option.textContent = item[extractName(dropdownData.languagedetail_key)].descr;
          option.dataset.article = item.article; 
          //default value
          if (selectedArticle === item.article) {
            option.classList.add('selected'); 
            document.getElementById('product-detail-view').querySelector(`span[data-for="${extractName(dropdownData.languagedetail_key)}"]`).textContent = option.textContent; 
          }
          let optionCollection = dropdown.children; 
          //only include unique options don't include duplicates
          if (optionCollection.length > 0) {
            let isUnique = true; 
            for (let i = 0; i < optionCollection.length; i++) {
              if (optionCollection[i].dataset.value === option.dataset.value) {
                isUnique = false;
                break; 
              } 
            }
            if (isUnique) {
              dropdown.appendChild(option); 
            }
          }
          //the very first iteration is automatically inserted
          else {
            dropdown.appendChild(option); 
          }
          break;
        }
      }
    }
  }
}

const showProductDetailPage = async (card) => {
  let productDetailData = await fetchSingleProductData(); 
  console.log('product data', productDetailData, productDetailData.constructor, typeof productDetailData);
  //populate the product detail view 
  if (productDetailData.constructor === Object) {
    //carousel
    updateProductDetailCarousel(productDetailData, card.style.backgroundImage);
    //details
    updateSingleProductDetails(productDetailData); 
    //dropdowns
    createSingleProductDropdowns(productDetailData, card.closest('.card').dataset.article); 
    document.getElementById('product-detail-view').classList.remove('slide-out'); 
  }
  else {
    showErrorMessage(productDetailData);
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