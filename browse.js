/* 
This JS file is a collection of functions that are used as the onclick event handlers for different inputs in the form that is generated in browse.xhtml. The architecture of this application involves the use of a proxy that makes the calls on the front end's behalf by using a form element. The inputs of that element are populated by the JS in this file and serve as the body of the subsequent message triggered by clicking on a link which corresponds with the specific input. This has put several constraints on our code flow and limited us to doing numerous operations in singular functions.  
*/

////////////
//GLOBALS//
//////////

//page info
const myURL = new URL(location); 
const store = myURL.searchParams.get('store');
const client = myURL.searchParams.get('clientName');
//default currency is USD, use the currency provided by the pricing API as the user's currency only after they have navigated to a product's detail view
let currency = "USD"; 
//the currency symbol method below comes from the back end, is not really helpful
// let currencySymbol = getCurrencySymbolAction([{'name':currency, 'value':currency}]);
//hierarchies 
let hierarchies = {
  lev1: [], //tells us how to drill down through the different categories 
  lev3: [], //tells us what dropdowns / options to display when a single product is selected
};
//filter
let appliedFilters = false; 
//api function handlers - since we must do all our UI / DOM logic in one function call we use these variables as a means to preserve state. They are necessary to help setup different outcomes based on what UI control triggered the call.
let items = {
  itemHierarchy: {
    categories: [], 
    count: null, 
    hierarchy: null, 
    openCard: false,
    filter: false, 
    card: null
  },
  styleLookup: {
    products: [], 
    count: null, 
    page: null,
    card: null,
    article: null, 
    incrementPage: false,
    searchBar: false,
    infiniteScroll: false,
    openCard: false,
    seeAll: false,
    filter: false, 
    styleLookupReqBody: {},
    dropdownChoice: null, 
    wasProductDetailDropdownClicked: false,
    showProductDetailPage: false
  }
};
let productDetail = {}; //holds all data pertaining to when a single product is selected (detail view)
//user selection
let userSelections = {}; //stores user's selections as they browse through categories
//DOM elements
let productDetailCarousel; 

///////////////////
//INITIALIZATION//
/////////////////

window.addEventListener('load', () => {
  showSpinner();
  checkPermission(); 
  //get screenmodels - this call will also get stores and render our initial panel in the browse section
  let screenModelBody = {}; 
  screenModelBody["kwi-store"] = store; 
  document.getElementById('screenModelParam').value = JSON.stringify(screenModelBody); 
  document.getElementById('screenModel').click(); 
  //wire event listeners 
  //search bar
  document.getElementById('search-bar').addEventListener('keyup', event => {
    if (document.getElementById('search-bar').value.trim() !== "" && event.code === 'Enter') {
      showSpinner();
      //clear out previous products
      document.querySelector('#products-page .cards ul').innerHTML = ""; 
      //create request body to get new products
      items.styleLookup.styleLookupReqBody = {}; 
      items.styleLookup.styleLookupReqBody["kwi-searchString"] = document.getElementById('search-bar').value.trim(); 
      items.styleLookup.styleLookupReqBody["kwi-store"] = store; 
      items.styleLookup.styleLookupReqBody["kwi-page"] = 1; 
      document.getElementById('styleLookUpParam').value = JSON.stringify(items.styleLookup.styleLookupReqBody);
      //execute call
      items.styleLookup.searchBar = true; 
      items.styleLookup.infiniteScroll = false; 
      items.styleLookup.openCard = false;
      items.styleLookup.seeAll = false;
      items.styleLookup.filter = false; 
      items.styleLookup.page = 1; 
      document.getElementById('styleLookup').click();
    }
  });
  //main section
  document.querySelector('main').addEventListener('click', event => {
    let target = event.target; 
    //cards
    if(target.matches('.card-image')) {
      //category cards
      if (target.parentNode.className === "category-card-button") {
        openCard(target.closest('.card')); 
      }
      //product cards
      else if (target.parentNode.className === "product-card-button") {
        let card = target.closest('.card');
        items.styleLookup.card = card;
        items.styleLookup.showProductDetailPage = true;
        fetchSingleProductData(card.dataset.article, card.dataset.venitem);
      }
    }
    //breadcrumb
    if(target.matches('.crumb')) {
      let count = parseInt(target.dataset.hierarchyIndex, 10); 
      let breadcrumbs = target.parentNode; 
      let page = target.closest('.page'); 
      let cards = page.querySelector('.cards ul').children;  
      for (let j = 0; j < breadcrumbs.children.length; j++) {
        if (parseInt(breadcrumbs.children[j].dataset.hierarchyIndex, 10) >= count) {
          //remove the other breadcrumbs that come after the crumb that was selected
          breadcrumbs.children[j].remove(); 
          j--;
        }
      }
      for (let i = 0; i < cards.length; i++) {
        //hide products that precede our selection
        if (parseInt(cards[i].dataset.hierarchyIndex, 10) < count) {
          cards[i].classList.add('display-none'); 
        }
        //make that particular crumb's products appear
        if (parseInt(cards[i].dataset.hierarchyIndex, 10) === count) {
          page.querySelector('.page-title').textContent = (target.textContent.indexOf('>') > -1) ? `${target.textContent.slice(3)}` : `Browse Categories`; 
          cards[i].classList.remove('display-none'); 
        }
        if (parseInt(cards[i].dataset.hierarchyIndex, 10) > count) {
          //set the userSelection for that specific hierarchy to null to show it no longer applies as a user selection
          userSelections[cards[i].dataset.hierarchy] = null; 
          //get rid of products that come after our selection
          cards[i].remove(); 
          i--;
        }
      }
      console.log('US', userSelections); 
    }
    //back button
    if (target.matches('.back-button')) {
      if (target.closest('section').id === "product-detail-view") {
        productDetailCarousel.destroy();
      }
      if (target.closest('section').id === "products-page") {
        appliedFilters = false; 
      }
      target.closest('section').classList.add('slide-out'); 
    }
    //close backscreen
    if (target.matches('.backscreen')) {
      if (target.id === "filter-menu-container") {
        
      }
      if (target.id !== "spinner-container") {
        target.classList.add('display-none');
      }
    }
    //close full size image
    if (target.matches('#close-image-button')) {
      document.getElementById('full-size-image-view').classList.add('slide-out');  
    }
    //single item dropdown option
    if (target.matches('.single-item-dropdown-option')) {
      items.styleLookup.wasProductDetailDropdownClicked = true; 
      items.styleLookup.dropdownChoice = target; 
      fetchSingleProductData(target.dataset.article, items.styleLookup.card.dataset.venitem);
    }
    //see all button 
    if (target.matches('.see-all-button') || target.matches('.see-all-count')) {
      showSpinner(); 
      //clear out previous products
      document.querySelector('#products-page .cards ul').innerHTML = ""; 
      //create call body
      items.styleLookup.styleLookupReqBody = {}; 
      items.styleLookup.styleLookupReqBody["kwi-store"] = store; 
      items.styleLookup.styleLookupReqBody["kwi-page"] = 1;
      for (let selection in userSelections) {
        if (userSelections[selection] !== null) {
          items.styleLookup.styleLookupReqBody[`kwi-${selection}`] = userSelections[selection].id; 
        }
      }
      document.getElementById('styleLookUpParam').value = JSON.stringify(items.styleLookup.styleLookupReqBody); 
      //execute call
      items.styleLookup.searchBar = false; 
      items.styleLookup.infiniteScroll = false; 
      items.styleLookup.openCard = false; 
      items.styleLookup.seeAll = true;
      items.styleLookup.filter = false; 
      items.styleLookup.page = 1; 
      document.getElementById('styleLookup').click();
    }
    //filter button
    if (target.matches('#filter-button') || target.matches('.filter-count')) {
      let allFilters = document.querySelectorAll('#filter-menu .filter');
      //if a set of filters were previously applied display them but if not then display the newly selected ones
      if (!appliedFilters) {
        document.getElementById('go-back-filter').click(); 
        for (let i = 0; i < allFilters.length; i++) {
          //populate navigation filters only
          if (userSelections[allFilters[i].dataset.hierarchy] !== undefined && userSelections[allFilters[i].dataset.hierarchy] !== null) {
            allFilters[i].querySelector('.filter-choice').textContent = userSelections[allFilters[i].dataset.hierarchy].text;
            allFilters[i].querySelector('.filter-choice').classList.add("color-blue");
            allFilters[i].querySelector('.filter-right-arrow').classList.add('display-none');
            allFilters[i].dataset.id = userSelections[allFilters[i].dataset.hierarchy].id;
            allFilters[i].dataset.type = "navigation";
          } 
          //regular filter
          // else if (allFilters[i].dataset.hierarchy !== "orderBy" || allFilters[i].dataset.hierarchy !== "price") {
          else {
            allFilters[i].dataset.type = "standard";
            if (userSelections[allFilters[i].dataset.hierarchy] !== null) {
              allFilters[i].querySelector('.filter-choice').textContent = "Any";
              allFilters[i].querySelector('.filter-choice').classList.remove("color-blue");
              allFilters[i].querySelector('.filter-right-arrow').classList.remove('display-none');
              allFilters[i].dataset.id = "";
            }
          }
        }
      }
      document.getElementById('filter-menu-container').classList.remove('display-none'); 
    }
    //filter
    if (target.matches('.filter') || target.matches('.filter-name') || target.matches('.filter-choice' || target.matches('.filter-right-arrow'))) {
      //collect type and hierarchy
      let type;
      let hierarchy;  
      if (target.dataset.type) {
        type = target.dataset.type; 
        hierarchy = target.dataset.hierarchy; 
      }
      else {
        type = target.closest('.filter').dataset.type;
        hierarchy = target.closest('.filter').dataset.hierarchy;
      }
      if (type === "standard") {
        //orderby filter
        if (hierarchy === "orderBy") {
          document.getElementById('filter-options-footer').classList.add('display-none');
          document.getElementById('filter-options-filter').classList.add('display-none');
          document.getElementById('filter-options-orderby').classList.remove('display-none');
          document.getElementById('filter-viewport').classList.add('overflow-hidden'); 
          document.getElementById('filter-secondary-menu').classList.remove('slide-out');
          //show checkmarks for orderby
          let checkmarks = document.querySelectorAll('#filter-options-orderby .checkmark'); 
          checkmarks[0].classList.add('hide');
          checkmarks[1].classList.add('hide');
          if (target.closest('.filter').dataset.orderBy === "priceLowToHigh") {
            checkmarks[0].classList.remove('hide');
          }
          else if (target.closest('.filter').dataset.orderBy === "priceHighToLow") {
            checkmarks[1].classList.remove('hide');
          }
        }
        //price filter
        else if (hierarchy === "price") {
          document.getElementById('filter-options-footer').classList.add('display-none');
          document.getElementById('filter-options-filter').classList.add('display-none');
          document.getElementById('filter-options-price').classList.remove('display-none');
          document.getElementById('filter-viewport').classList.add('overflow-hidden'); 
          document.getElementById('filter-secondary-menu').classList.remove('slide-out'); 
        }
        //all other filters except ones that were populated due to browsing 
        else { 
          //create request body
          let itemHierarchyCallBody = {};
          let allFilters = document.querySelectorAll('#filter-menu .filter');
          for (let filter = 0; filter < allFilters.length; filter++) {
            if (allFilters[filter].dataset.id) { 
              itemHierarchyCallBody[`kwi-${allFilters[filter].dataset.hierarchy}`] = allFilters[filter].dataset.id; 
            }
          }
          //the selected filter is what gets returned by the itemHierarchy call
          itemHierarchyCallBody["kwi-returnHierarchy"] = hierarchy; 
          showSpinner(); 
          document.getElementById('itemHierarchyParam').value = JSON.stringify(itemHierarchyCallBody);
          items.itemHierarchy.hierarchy = hierarchy; 
          items.itemHierarchy.openCard = false; 
          items.itemHierarchy.filter = true; 
          document.getElementById('itemHierarchy').click(); 
        } 
      }

    }
    //filter choice 
    if (target.matches('.secondary-choice') || target.matches('.secondary-filter-choice') || target.matches('.secondary-filter-choice .checkmark')) {
      target.closest('li').querySelector('.checkmark').classList.toggle('hide'); 
    }
    //reset filter button
    if (target.matches('#reset-filter')) {
      //reset standard filter selection display to none selected
      let allFilters = document.querySelectorAll('#filter-menu .filter');
      for (let i = 0; i < allFilters.length; i++) {
        if (allFilters[i].dataset.type === "standard") {
          allFilters[i].querySelector('.filter-choice').textContent = "Any"; 
          allFilters[i].querySelector('.filter-choice').classList.remove('color-blue'); 
          allFilters[i].dataset.id = ""; 
        }
      }
      //reset additional filter data attributes
      document.querySelector('#filter-menu li[data-hierarchy="orderBy"]').dataset.orderBy = ""; 
      document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.min = ""; 
      document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.max = "";
      appliedFilters = false; 
      //hide checkmarks for orderby
      let checkmarks = document.querySelectorAll('#filter-options-orderby .checkmark'); 
      checkmarks[0].classList.add('hide');
      checkmarks[1].classList.add('hide');
      //reset UI controls
      document.getElementById('filter-viewport').classList.remove('overflow-hidden'); 
      document.getElementById('filter-options-filter').classList.remove('display-none');
      document.getElementById('filter-options-footer').classList.remove('display-none');
      document.getElementById('filter-options-orderby').classList.add('display-none');
      document.getElementById('filter-options').classList.add('display-none');
      document.getElementById('filter-secondary-menu').classList.add('slide-out'); 
    }
    //apply filter button
    if (target.matches('#apply-filter')) {
      showSpinner();
      //clear out previous products
      document.querySelector('#products-page .cards ul').innerHTML = ""; 
      //create request body
      let count = 0; 
      items.styleLookup.styleLookupReqBody = {}; 
      items.styleLookup.styleLookupReqBody["kwi-store"] = store; 
      items.styleLookup.styleLookupReqBody["kwi-page"] = 1; 
      let allFilters = document.querySelectorAll('#filter-menu .filter');
      for (let filter = 0; filter < allFilters.length; filter++) {
        if (allFilters[filter].dataset.id) { 
          items.styleLookup.styleLookupReqBody[`kwi-${allFilters[filter].dataset.hierarchy}`] = allFilters[filter].dataset.id;
          count++;
        }
      }
      //check if orderBy filter is applied
      let orderBy = document.querySelector('#filter-menu li[data-hierarchy="orderBy"]').dataset.orderBy; 
      if (orderBy) {
        items.styleLookup.styleLookupReqBody['kwi-orderBy'] = orderBy;
        count++;
      }
      //check if price filters are applied
      let minInputValue = document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.min; 
      let maxInputValue = document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.max; 
      if (minInputValue) {
        items.styleLookup.styleLookupReqBody['kwi-minPrice'] = minInputValue;
        count++;
      }
      if (maxInputValue) {
        items.styleLookup.styleLookupReqBody['kwi-maxPrice'] = maxInputValue;
        count++;
      }
      //the price range is one filter, not two and the count should be adjusted accordingly
      if (maxInputValue && minInputValue) {
        count--;
      }
      document.getElementById('styleLookUpParam').value = JSON.stringify(items.styleLookup.styleLookupReqBody);
      //execute request 
      items.styleLookup.searchBar = false; 
      items.styleLookup.infiniteScroll = false; 
      items.styleLookup.openCard = false;
      items.styleLookup.seeAll = false; 
      items.styleLookup.filter = true; 
      items.styleLookup.page = 1; 
      document.getElementById('styleLookup').click();
      //update filter button
      document.querySelector('#filter-button .filter-count').textContent = ` (${count})`;
    }  
    //go back filter button
    if (target.matches('#go-back-filter')) {
      //reset UI controls
      document.getElementById('filter-viewport').classList.remove('overflow-hidden'); 
      document.getElementById('filter-options-filter').classList.remove('display-none');
      document.getElementById('filter-options-footer').classList.remove('display-none');
      document.getElementById('filter-options-orderby').classList.add('display-none');
      document.getElementById('filter-secondary-menu').classList.add('slide-out'); 
      //if we are coming back from price range selection show price range values in filter list
      if (!document.getElementById('filter-options-price').classList.contains('display-none')) {
        let priceRange = "";
        let minInputValue = document.querySelector('#filter-options-price [name="from-price"]').value.trim();
        let maxInputValue = document.querySelector('#filter-options-price [name="to-price"]').value.trim();
        if (minInputValue !== "" && maxInputValue !== "") {
          if (parseInt(minInputValue, 10) > parseInt(maxInputValue, 10)) {
            showErrorMessage('Invalid price filter. Min price must be less than or equal to max price.'); 
            return; 
          }
          priceRange = `${monetize(minInputValue.trim(), currency)} - ${monetize(maxInputValue.trim(), currency)}`;
        }
        else if (minInputValue !== "") {
          priceRange = `> ${monetize(minInputValue.trim(), currency)}`;
        }
        else if (maxInputValue !== "") {
          priceRange = `0 - ${monetize(maxInputValue.trim(), currency)}`;
        }
        if (priceRange !== "") {
          document.querySelector('#filter-menu li[data-hierarchy="price"] .filter-choice').textContent = priceRange; 
          document.querySelector('#filter-menu li[data-hierarchy="price"] .filter-choice').classList.add('color-blue');
          document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.min = minInputValue.trim(); 
          document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.max = maxInputValue.trim(); 
        }
        else {
          document.querySelector('#filter-menu li[data-hierarchy="price"] .filter-choice').textContent = "Any"; 
          document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.min = ""; 
          document.querySelector('#filter-menu li[data-hierarchy="price"]').dataset.max = ""; 
          document.querySelector('#filter-menu li[data-hierarchy="price"] .filter-choice').classList.remove('color-blue'); 
        }
        document.getElementById('filter-options-price').classList.add('display-none');
      }
      //if we are coming back from a standard filter choice navigation screen
      else if (!document.getElementById('filter-options').classList.contains('display-none')) {
        let selected = {};
        selected[items.itemHierarchy.hierarchy] = ""; 
        let filters = document.getElementById('filter-options').children;
        let count = 0;
        let choiceName = "";  
        //take selected filter choices and apply them to the main filter they represent
        for (let filter = 0; filter < filters.length; filter++) {
          if (!filters[filter].children[1].classList.contains('hide')) {
            selected[items.itemHierarchy.hierarchy] = selected[items.itemHierarchy.hierarchy] + filters[filter].dataset.id + "|"; 
            choiceName = `${choiceName} ${filters[filter].dataset.descr},`;  
            count++; 
          } 
        }
        let filter = document.querySelector(`#filter-menu li[data-hierarchy="${items.itemHierarchy.hierarchy}"]`);  
        //choices were selected so show them
        if (selected[items.itemHierarchy.hierarchy] !== "") {
          choiceName = choiceName.slice(0, -1);
          filter.querySelector('.filter-choice').textContent = choiceName;  
          filter.querySelector('.filter-choice').classList.add('color-blue'); 
          //assign id to be used in styleLookup API call
          selected[items.itemHierarchy.hierarchy] = selected[items.itemHierarchy.hierarchy].slice(0, -1); 
          filter.dataset.id = selected[items.itemHierarchy.hierarchy]; 
        } 
        //choices were not selected so clear out filter 
        else {
          filter.querySelector('.filter-choice').textContent = "Any";
          filter.querySelector('.filter-choice').classList.remove('color-blue'); 
          filter.dataset.id = ""; 
        }
        document.getElementById('filter-options').classList.add('display-none');
      }
    }
    //select all filter button
    if (target.matches('#select-all-filter')) {
      let filters = document.getElementById('filter-options').children;
      for (let filter = 0; filter < filters.length; filter++) {
        filters[filter].children[1].classList.remove('hide'); 
      }
    } 
    //deselect all filter button
    if (target.matches('#deselect-all-filter')) {
      let filters = document.getElementById('filter-options').children;
      for (let filter = 0; filter < filters.length; filter++) {
        filters[filter].children[1].classList.add('hide'); 
      }
    }
    //orderby filter options
    if (target.matches('#filter-options-orderby li') || target.matches('#filter-options-orderby li span')) {
      //show selected choice's checkmark
      let checkmarks = document.querySelectorAll('#filter-options-orderby .checkmark'); 
      checkmarks[0].classList.add('hide');
      checkmarks[1].classList.add('hide');
      target.closest('li').querySelector('.checkmark').classList.remove('hide'); 
      //apply selection text to filter menu
      document.querySelector('#filter-menu li[data-hierarchy="orderBy"] .filter-choice').textContent = target.closest('li').querySelector('.secondary-filter-name').textContent; 
      document.querySelector('#filter-menu li[data-hierarchy="orderBy"] .filter-choice').classList.add('color-blue'); 
      //assign appropriate value for subsequent styleLookup API call
      let orderbyHeaderValue = ""; 
      if (checkmarks[0].classList.contains('hide')) {
        orderbyHeaderValue = "priceHighToLow";
      }
      else {
        orderbyHeaderValue = "priceLowToHigh";
      }
      document.querySelector('#filter-menu li[data-hierarchy="orderBy"]').dataset.orderBy = orderbyHeaderValue; 
      document.getElementById('go-back-filter').click(); 
    }
  });
  //error message
  document.getElementById('error-message-close-button').addEventListener('click', hideErrorMessage);
  //infinite scroll for products page
  document.querySelector('#products-page .cards').addEventListener('scroll', debounce(() => {
    infiniteScroll(); 
  }, 1000));
  //filter choice filter
  let setTimeoutID;
  document.getElementById('filter-options-filter').addEventListener('keyup', function() {
    //clear prevous input event (we want to debounce this listener)
    clearTimeout(setTimeoutID);
    //create the function to execute on input change
    let inputFunction = function() {
      let options = document.getElementById('filter-options').children;
      let filterValue = document.getElementById('filter-options-filter').value.toLowerCase();
      setTimeoutID = window.setTimeout(function() {
        // Loop through all options and hide those that don't match the search query
        for (let j = 0; j < options.length; j++) {
          if (options[j].textContent.toLowerCase().indexOf(filterValue) > -1) {
            options[j].classList.remove('display-none');
          }
          else {
            options[j].classList.add('display-none');
          }
        }
      }, 500);
    };
    //inovke function and trigger setTimeout
    inputFunction();
  });
}); 

//////////////
//API CALLS//
////////////

const getStoresCall = (xhr, status, args) => {
  console.log("************** GET STORES **************");
  console.log("xhr",xhr);
  console.log("status", status);
  let response = JSON.parse(args.result); 
  console.log("response", response);  
  if (response.result.stores.length > 0) {
    //insert store & client name into the UI
    let storeName = response.result.stores[0].name;
    let storeNameElems = document.querySelectorAll('.store-name');
    let clientNameElems = document.querySelectorAll('.company-title');
    for (let i = 0; i < storeNameElems.length; i++) {
      storeNameElems[i].textContent = storeName; 
      clientNameElems[i].textContent= client; 
    }
    //execute itemHierarchy API call and make cards for initial screen (Browse)
    items.itemHierarchy.hierarchy = hierarchies.lev1[0]; 
    let itemHierarchyCallBody = {}; 
    itemHierarchyCallBody["kwi-returnHierarchy"] = items.itemHierarchy.hierarchy; 
    document.getElementById('itemHierarchyParam').value = JSON.stringify(itemHierarchyCallBody);
    document.getElementById('itemHierarchy').click(); 
  }
  else {
    showErrorMessage(`Store name not returned - ${xhr, status}`);
  }
};

const getScreenModel = (xhr, status, args) => {
  console.log("************** GET SCREENMODEL **************");
  console.log("xhr",xhr);
  console.log("status", status);
  let response = JSON.parse(args.result); 
  console.log("response", response); 
  if (response.result.screenModels.length > 0) {
    //make filter menu
    let filterCollection = document.createDocumentFragment(); 
    for (let hierarchy of  response.result.screenModels) {
      let filter = document.createElement('li');
      filter.className = "filter flex-container-row space-between";
      filter.innerHTML = `<span class="filter-name">${hierarchy.languagedetail_text}</span><div class="flex-container-row space-between"><span class="filter-choice">Any</span><span class="filter-right-arrow">&#8250;</span></div>`; 
      filter.dataset.hierarchy = extractName(hierarchy.componentkey); 
      filterCollection.appendChild(filter); 
      //separate product hierarchies 
      if (hierarchy.level === 1) {
        hierarchies.lev1.push(extractName(hierarchy.componentkey)); 
      }
      else if (hierarchy.level === 3) {
        hierarchies.lev3.push(hierarchy); 
      }
    }
    document.getElementById('filter-menu').appendChild(filterCollection); 
    //execute stores call
    document.getElementById('storesParam').value = `store=${store}`;
    document.getElementById('stores').click(); 
  }
  else {
    showErrorMessage(`Screen Models not returned - ${xhr, status}`);
  }
};

const getStyleLookup = (xhr, status, args) => {
  items.styleLookup.products.length = 0; 
  console.log("************** GET STYLE LOOKUP **************");
  console.log("xhr",xhr);
  console.log("status", status);
  let response = JSON.parse(args.result); 
  console.log("response", response);  
  items.styleLookup.products = response.result.styles;
  items.styleLookup.count = response.result.count;
  let panel = document.getElementById('products-page'); 
  if (status === "success") {
    if (items.styleLookup.products.length > 0) {
      //insert products
      insertCards(items.styleLookup.products);
      //update filter count
      let filterCount = 0; 
      for (let selection in userSelections) {
        if (userSelections[selection] !== null) {
          filterCount++; 
        }
      }
      let oldFilterCountText = panel.querySelector('.filter-count').textContent;
      panel.querySelector('.filter-count').textContent = ` (${filterCount})`;
      //apply correct title, update filter button
      if (items.styleLookup.searchBar) {
        panel.querySelector('.page-title').textContent = `${document.getElementById('search-bar').value.trim()} (${items.styleLookup.count})`; 
        panel.querySelector('.filter-count').textContent = ` (0)`; 
        document.getElementById('filter-button').classList.add('display-none'); 
      }
      else if (items.styleLookup.infiniteScroll) {
        items.styleLookup.page++; 
      }
      else if (items.styleLookup.openCard) {
        panel.querySelector('.page-title').textContent = `${items.styleLookup.card.closest('.card').querySelector('.caption').textContent} (${items.styleLookup.count})`; 
        document.getElementById('filter-button').classList.remove('display-none');
      }
      else if (items.styleLookup.seeAll) {
        panel.querySelector('.page-title').textContent = `${document.getElementById('categories-page').querySelector('.page-title').textContent} (${items.styleLookup.count})`; 
        document.getElementById('filter-button').classList.remove('display-none');
      }
      else if (items.styleLookup.filter) {
        document.getElementById('filter-menu-container').classList.add('display-none'); 
        panel.querySelector('.filter-count').textContent = oldFilterCountText;
        appliedFilters = true; 
      }
      panel.classList.remove('slide-out'); 
      //fire the call again until we fill the viewable screen and cause an overflow so as to ensure infinite scroll can be activated
      let productsViewport = document.querySelector('#products-page .cards'); 
      let productsContainer = document.querySelector('#products-page .cards ul'); 
      let h1 = productsContainer.clientHeight;
      let h2 = productsViewport.clientHeight; 
      //make sure there are more products we can request 
      if (h1 < h2 && productsContainer.children.length < parseInt(items.styleLookup.count, 10)) {
        let oldValue = document.getElementById('styleLookUpParam').value; 
        let pageIndex = oldValue.indexOf("kwi-page"); 
        let commaIndex = oldValue.indexOf(",", pageIndex); 
        let oldNum = oldValue.slice(pageIndex + 10, commaIndex); 
        let newNum = parseInt(oldNum, 10) + 1; 
        let newValue = oldValue.replace(`"kwi-page":${oldNum}`, `"kwi-page":${newNum}`); 
        document.getElementById('styleLookUpParam').value = newValue;
        items.styleLookup.page = newNum; 
        document.getElementById('styleLookup').click();
      }
      else {
        hideSpinner(); 
      }
      console.log("CC1", productsViewport.scrollTop, productsViewport.scrollHeight, productsViewport.offsetHeight, productsViewport.clientHeight);
      console.log("CC2", productsContainer.scrollTop, productsContainer.scrollHeight, productsContainer.offsetHeight, productsContainer.clientHeight);
    }
    else {
      showErrorMessage('No products returned!');
      if (items.styleLookup.page > 1) {
        items.styleLookup.page = items.styleLookup.page - 1;
      }
      hideSpinner(); 
    }
  }
  else {
    showErrorMessage('Product call failed!');
    console.error("STATUS", status);
    items.styleLookup.page = items.styleLookup.page - 1;
    hideSpinner(); 
  }
};

const getItemHierarchy = (xhr, status, args) => {
  items.itemHierarchy.categories.length = 0; 
  console.log("************** GET ITEM HIERARCHY **************");
  console.log("xhr",xhr);
  console.log("status", status);
  let response = JSON.parse(args.result); 
  console.log("response", response);  
  if (status === "success") {
    // the item hierarchy call can either return categories as items or products as styles. the categories are returned first and the styles (a.k.a. products) are returned when the user has drilled down to the very last category and can go no further
    items.itemHierarchy.categories = response.result.items || response.result.styles;
    items.itemHierarchy.count = response.result.totalCount; 
    if (items.itemHierarchy.categories.length > 0) {
      //for when a filter is applied
      if (items.itemHierarchy.filter) {
        //create the specific choices based on the specific filter selected
        let options = document.createDocumentFragment(); 
        let categories = items.itemHierarchy.categories; 
        let chosenFilterID = document.querySelector(`#filter-menu .filter[data-hierarchy="${items.itemHierarchy.hierarchy}"]`).dataset.id;
        chosenFilterID = chosenFilterID.split("|"); 
        for (let category = 0; category < categories.length; category++) {
          let li = document.createElement('li'); 
          li.className = "secondary-choice flex-container-row space-between";
          li.dataset.id = categories[category]['id'];  
          li.dataset.descr = categories[category]['descr'];  
          //display blue arrows if the filter previously had choices selected by the user
          if (chosenFilterID !== "" && chosenFilterID.includes(categories[category]['id'])) {
            li.innerHTML = `<span class="secondary-filter-choice">${categories[category]['descr']} (${categories[category]['cnt']})</span><span class="checkmark color-blue">&#10003;</span>`;
          }
          else {
            li.innerHTML = `<span class="secondary-filter-choice">${categories[category]['descr']} (${categories[category]['cnt']})</span><span class="checkmark color-blue hide">&#10003;</span>`;
          }
          options.appendChild(li); 
        }
        //get rid of old choices
        document.getElementById('filter-options').innerHTML = ""; 
        //add new choices
        document.getElementById('filter-options').appendChild(options); 
        document.getElementById('filter-viewport').scrollTop = 0; 
        document.getElementById('filter-options').classList.remove('display-none');
        document.getElementById('filter-viewport').classList.add('overflow-hidden'); 
        document.getElementById('filter-secondary-menu').classList.remove('slide-out'); 
      }
      //upon initial loadup of browse screen or if a card is clicked
      else {
        let page = document.getElementById('categories-page');
        //update see all button count
        page.querySelector('.see-all-count').textContent = ` (${items.itemHierarchy.count})`;
        //for when a categories card is clicked
        if (items.itemHierarchy.openCard) {
          //hide other categories
          let categories = page.querySelector('.cards ul'); 
          if (categories) {
            for (let i = 0; i < categories.children.length; i++) {
              categories.children[i].classList.add('display-none');
            }
          }
          //create breadcrumb
          let crumb = document.createElement('li');
          crumb.className = "crumb";
          crumb.dataset.hierarchyIndex = page.querySelector('.breadcrumbs').children.length + 1; 
          if (page.querySelector('.breadcrumbs').children.length > 0) {
            crumb.textContent = ` > ${page.querySelector('.page-title').textContent}`;
          }
          else {
            crumb.textContent = "Browse"; 
            crumb.addEventListener('click', () => {
              page.querySelector('.breadcrumbs').classList.add('hide'); 
              page.querySelector('.see-all-button').classList.add('hide'); 
              page.querySelector('.page-title').textContent = `Browse Categories`;
            });
          }
          page.querySelector('.breadcrumbs').appendChild(crumb); 
          //update title of page
          page.querySelector('.page-title').textContent = `${items.itemHierarchy.card.closest('.card').querySelector('.caption').textContent}`;
          page.querySelector('.breadcrumbs').classList.remove('hide'); 
          //reveal see-all button
          page.querySelector('.see-all-button').classList.remove('hide');
        }
        //add new cards
        insertCards(items.itemHierarchy.categories, items.itemHierarchy.hierarchy);
      }
    }
    else {
      showErrorMessage(`No results returned!`);
    }
    hideSpinner(); 
  }
  else {
    showErrorMessage(`${status} - Item Hierarchy call failed!`);
    console.error("STATUS", status);
    hideSpinner(); 
  }
};

const getStyleDetail = (xhr, status, args) => {
  console.log("************** GET STYLE DETAIL **************");
  console.log("xhr",xhr);
  console.log("status", status);
  let response = JSON.parse(args.result); 
  console.log("response", response); 
  if (status == "success") {
    //store style detail data
    productDetail =  {...response.result}; 
    //get product data
    document.getElementById('productParam').value = `articles=${items.styleLookup.article}&media="true"`; 
    document.getElementById('products').click(); 
  }
  // else if (status !== "begin" && status !== "complete") {
  else {
    showErrorMessage(`${status} - Style Detail call failed!`);
    hideSpinner(); 
  }
}; 

const getProductsCall = (xhr, status, args) => {
  console.log("************** GET PRODUCT **************");
  console.log("xhr",xhr);
  let response = JSON.parse(args.result); 
  console.log("response", response); 
  console.log("status", status);
  if (status == "success") {
    //store product data
    productDetail = {...productDetail, ...response.result}; 
    //get pricing data
    //format date and time to suit the back end requirements
    var localDateTime = new Date().toISOString().split("T");
    var date = localDateTime[0];
    var time = localDateTime[1].slice(0, 8);
    time.replace(":", "");
    time.replace(":", "");
    time.replace(":", "");
    localDateTime = date + " " + time;
    let pricingBody = {
      localDateTime: localDateTime, 
      store: store, 
      transaction: {
        lineItems: [
          {
            sku: items.styleLookup.article, 
            qty: 1, 
            id: 1, 
            transactionRowId: 1
          }
        ]
      }
    }; 
    document.getElementById('pricingParam').value = JSON.stringify(pricingBody); 
    document.getElementById('pricing').click(); 
  }
  else {
    showErrorMessage(`${status} - Get Product call failed!`);
    hideSpinner(); 
  }
};

const getPricingCall = (xhr, status, args) => {
  console.log("************** GET PRICING **************");
  console.log("xhr",xhr);
  console.log("status", status);
  let response = JSON.parse(args.result); 
  console.log("response", response); 
  if (status == "success") {
    //store pricing data
    productDetail = {...productDetail, ...response.result}; 
    //get inventory data
    document.getElementById('inventoryParam').value = `article=${items.styleLookup.article}`; 
    document.getElementById('inventory').click();  
  }
  else {
    showErrorMessage(`${status} - Get Pricing call failed!`);
    hideSpinner(); 
  }
}; 

const getInventory = (xhr, status, args) => {
  console.log("************** GET INVENTORY **************");
  console.log("xhr",xhr);
  console.log("status", status);
  let response = JSON.parse(args.result); 
  console.log("response", response); 
  if (status == "success") {
    //store inventory data
    productDetail = {...productDetail, ...response.result};
    //show product detail page if appropriate
    if (items.styleLookup.showProductDetailPage) {
      console.log('product data', productDetail, productDetail.constructor, typeof productDetail);
      if (productDetail.constructor === Object) { //todo - replace with a valid check
        //carousel
        updateProductDetailCarousel(productDetail, items.styleLookup.card.querySelector('.card-image').style.backgroundImage);
        //details
        updateSingleProductDetails(productDetail); 
        //dropdowns
        createSingleProductDropdowns(productDetail, items.styleLookup.card.dataset.article); 
        document.getElementById('product-detail-view').classList.remove('slide-out'); 
      }
      items.styleLookup.showProductDetailPage = false; 
    }
    //if product detail dropdown was clicked 
    else if (items.styleLookup.wasProductDetailDropdownClicked) {
      if (productDetail.constructor === Object) { //todo 
        //user clicked on a disabled choice
        if (items.styleLookup.dropdownChoice.classList.contains('color-grey')) {
          //remove the greyed out choices from the selected dropdown
          let selectedDropdown = items.styleLookup.dropdownChoice.parentNode; 
          for (let i = 0; i < selectedDropdown.children.length; i++) {
            selectedDropdown.children[i].classList.remove('color-grey'); 
          } 
        }
        //user clicked on a supported choice 
        else {
          //update carousel
          updateProductDetailCarousel(productDetail);
          //update details
          updateSingleProductDetails(productDetail); 
        }
        //update dropdowns
        assignSingleProductDropdownOptionStatus(productDetail, items.styleLookup.dropdownChoice); 
      }
      items.styleLookup.wasProductDetailDropdownClicked = false; 
    }
    hideSpinner(); 
  }
  else {
    showErrorMessage(`${status} - Get Inventory call failed!`);
    hideSpinner(); 
  }
}; 

const fetchSingleProductData = (article) => {
  showSpinner(); 
  //save article to be used in subsequent API calls like getProduct
  items.styleLookup.article = article;
  //create style detail call body
  let styleDetailBody = {}; 
  styleDetailBody["kwi-store"] = store; 
  styleDetailBody["kwi-article"] = article; 
  document.getElementById('styleDetailParam').value = JSON.stringify(styleDetailBody); 
  document.getElementById('styleDetail').click(); 
};

////////////
//METHODS//
//////////

const debounce = (callback, wait) => {
  let timeout;
  return (...args) => {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => callback.apply(context, args), wait);
  };
};

const insertCards = (data, hierarchy) => {
  if (data.length > 0) {
    let cards = createCards(data);
    //select appropriate card container
    let cardsContainer; 
    if (hierarchy) {
      cardsContainer = document.getElementById('categories-page').querySelector('.cards ul');
      //assign hierarchy index 
      let hierarchyIndex; 
      if (cardsContainer.children.length === 0) {
        hierarchyIndex = 1; 
      }
      else {
        hierarchyIndex = parseInt(cardsContainer.children[cardsContainer.children.length - 1].dataset.hierarchyIndex, 10) + 1;
      }
      for (let i = 0; i < cards.children.length; i++) {
        cards.children[i].dataset.hierarchy = hierarchy;
        cards.children[i].dataset.hierarchyIndex = hierarchyIndex; 
      }
    }
    else {
      cardsContainer = document.querySelector('#products-page .cards ul');
    } 
    cardsContainer.appendChild(cards); 
  }
};

const infiniteScroll = () => {
  let productsViewport = document.querySelector('#products-page .cards'); 
  let productsContainer = document.querySelector('#products-page .cards ul'); 
  //if there are more products we can request
  if (productsContainer.children.length < items.styleLookup.count) {
    console.log(productsViewport.scrollTop, productsViewport.scrollHeight, productsViewport.offsetHeight, productsViewport.clientHeight);
    //if we are at the bottom of the scrollable view
    if (productsViewport.scrollTop + productsViewport.clientHeight + 10 >= productsViewport.scrollHeight) {
      showSpinner();
      items.styleLookup.styleLookupReqBody["kwi-page"] = items.styleLookup.page + 1;
      document.getElementById('styleLookUpParam').value = JSON.stringify(items.styleLookup.styleLookupReqBody); 
      items.styleLookup.searchBar = false; 
      items.styleLookup.infiniteScroll = true; 
      items.styleLookup.openCard = false;
      items.styleLookup.seeAll = false; 
      items.styleLookup.filter = false; 
      document.getElementById('styleLookup').click();
    }
  }
};

const showErrorMessage = message => {
  document.getElementById('error-message-text').textContent = message; 
  document.getElementById('error-message-container').classList.remove('display-none');
  document.getElementById('error-message-close-button').focus(); 
  console.error(message); 
};

const hideErrorMessage = () => {
  document.getElementById('error-message-container').classList.add('display-none');
};

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
};

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
};

const createCards = cardData => {
  let products = document.createDocumentFragment(); 
  //create card
	for (let data of cardData) {
    let card = document. createElement('div');
    card.className = "card"; 
    if (data.id) {
      card.dataset.id = data.id; 
    }
    let imageContainer = document. createElement('div');
    imageContainer.className = "category-card-image-container"; 
		let button = document.createElement('button');
    button.className = "category-card-button";
    button.type = "button"; 
    button.innerHTML = `<div class="card-image" style="background-image: url(${data.picture})" />`;
    let caption = document.createElement('p');
    caption.className = "caption"; 
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
  showSpinner(); 
  //record user selection for itemHierarchy API call
  let currentHierarchy = card.dataset.hierarchy; 
  if (userSelections[currentHierarchy] === undefined || userSelections[currentHierarchy] === null) {
    userSelections[currentHierarchy] = {}; 
  }
  userSelections[currentHierarchy]['id'] = card.dataset.id; 
  userSelections[currentHierarchy]['text'] = card.querySelector('.caption').textContent; 
  let isFinalResult = (card.dataset.hierarchy === hierarchies.lev1[hierarchies.lev1.length - 1]) ? true : false; 
  //is a product
  if (isFinalResult) { 
    //clear out previous products
    document.getElementById('products-page').querySelector('.cards ul').innerHTML = ""; 
    //create request body - use styleLookup API to get new products
    items.styleLookup.styleLookupReqBody = {};
    items.styleLookup.styleLookupReqBody["kwi-store"] = store; 
    items.styleLookup.styleLookupReqBody["kwi-page"] = 1; 
    for (let selection in userSelections) {
      if (userSelections[selection] !== null) {
        items.styleLookup.styleLookupReqBody[`kwi-${selection}`] = userSelections[selection]['id']; 
      }
    }
    document.getElementById('styleLookUpParam').value = JSON.stringify(items.styleLookup.styleLookupReqBody); 
    //execute request
    items.styleLookup.searchBar = false; 
    items.styleLookup.infiniteScroll = false; 
    items.styleLookup.openCard = true;
    items.styleLookup.seeAll = false;
    items.styleLookup.filter = false; 
    items.styleLookup.card = card; 
    items.styleLookup.page = 1; 
    document.getElementById('styleLookup').click();
  }
  //is another category / dept 
  else { 
    //create request body - use itemHierarchy API to get new categories
    let itemHierarchyCallBody = {};
    for (let selection in userSelections) {
      if (userSelections[selection] !== null) {
        itemHierarchyCallBody[`kwi-${selection}`] = userSelections[selection]['id']; 
      }
    }

    let currentHierarchyIndex = parseInt(hierarchies.lev1.indexOf(card.dataset.hierarchy)); 
    itemHierarchyCallBody["kwi-returnHierarchy"] = hierarchies.lev1[currentHierarchyIndex + 1];
    document.getElementById('itemHierarchyParam').value = JSON.stringify(itemHierarchyCallBody);
    items.itemHierarchy.hierarchy = hierarchies.lev1[currentHierarchyIndex + 1]; 
    items.itemHierarchy.openCard = true;
    items.itemHierarchy.filter = false;  
    items.itemHierarchy.card = card; 
    document.getElementById('itemHierarchy').click();
  }
};

const updateProductDetailCarousel = (data, headerImgUrl) => {
  if (headerImgUrl) {
    document.querySelector('.hero-header').style.backgroundImage = headerImgUrl;
  }
  let slides = document.createDocumentFragment();
  let bullets = document.createDocumentFragment();
  let count= 0; 
  for (let slideData of data.products[0].media) {
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
  });
  productDetailCarousel.mount();
};

const updateSingleProductDetails = (data) => {
  //product name
  document.getElementById('single-item-name').textContent = data.descr; 
  //product price
  let liFrag = document.createDocumentFragment();
  let priceListItem = document.createElement('li');
  let bullet = document.createElement('li');
  bullet.innerHTML = "&#8226;";
  let salePrice = data.pricing.etran.lineItems[0].price.value; 
  let originalPrice = data.pricing.etran.lineItems[0].originalPrice.value; 
  //use the currency provided by the pricing API as the user's currency
  currency = data.pricing.etran.lineItems[0].originalPrice.currency; 
  if (salePrice < originalPrice) {
    priceListItem.innerHTML = `<span class="sale-price">${monetize(salePrice, currency)}</span><span class="strike-through color-grey">${monetize(originalPrice, currency)}</span>`; //todo - internationalize
  }
  else {
    priceListItem.innerHTML = `<span>${monetize(originalPrice, currency)}</span>`; //todo - internationalize
  }
  //amount in stock
  let stockListItem = document.createElement('li');
  let stock = (data.inventory.stores.length > 0) ? data.inventory.stores[0].store[store].articles[0].onhand : 0; 
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
  liFrag.appendChild(bullet); 
  liFrag.appendChild(stockListItem);
  document.getElementById('single-item-details').innerHTML = ""; 
  document.getElementById('single-item-details').appendChild(liFrag);
};

const assignSingleProductDropdownOptionStatus = (data, selectedDropdown) => {
  let selectedValue = selectedDropdown.dataset.value; 
  let selectedTextContent = selectedDropdown.textContent; 
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
            }
            else {
              let arr = []; 
              arr.push(item[prop].id || item[prop]);
              supported[prop] = arr; 
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
        //remove any possible previous greyed out options for a supported choice
        if (supported[allDropdowns[dropdown].id].includes(allDropdowns[dropdown].children[option].dataset.value)) {
          allDropdowns[dropdown].children[option].classList.remove('color-grey'); 
        } 
        //if not supported then grey out choice
        else {
          allDropdowns[dropdown].children[option].classList.add('color-grey'); 
        }
      }
      //make sure any currently selected dropdown choices in the other dropdowns are supported. If not then erase their selection
      let display = allDropdowns[dropdown].closest('.dropdown-container').querySelector('.choice-display');
      if (!supported[allDropdowns[dropdown].id].includes(display.dataset.value)) {
        display.dataset.value = ""; 
        display.textContent = ""; 
      }
    }
  }
  //add a checkmark to the selection
  let selectedDropdownOptions = selectedDropdown.parentNode.children; 
  for (let i = 0; i < selectedDropdownOptions.length; i++){
    if (selectedDropdownOptions[i].dataset.value === selectedValue) {
      selectedDropdownOptions[i].classList.add('selected'); 
    }
    else {
      selectedDropdownOptions[i].classList.remove('selected'); 
    }
  }
  //display the selection 
  selectedDropdown.closest('.dropdown-container').querySelector('.choice-display').dataset.value = selectedValue; 
  selectedDropdown.closest('.dropdown-container').querySelector('.choice-display').textContent = selectedTextContent; 
  //close dropdown
  selectedDropdown.closest('.backscreen').click(); 
};

const createSingleProductDropdowns = (data, selectedArticle) => {
  //dropdowns
  let dropdownsFrag = document.createDocumentFragment(); 
  for (let dropdown of hierarchies.lev3) {
    //overall container
    let dropdownContainer = document.createElement('div');
    dropdownContainer.className = "dropdown-container flex-container-row";
    //reveal the dropdown choices when clicked
    dropdownContainer.addEventListener('click', () => {
      dropdownContainer.querySelector('.backscreen').classList.remove('display-none');
    }); 
    //label
    let label = document.createElement('label');
    label.textContent = dropdown.languagedetail_text; 
    label.setAttribute('for', extractName(dropdown.languagedetail_key)); 
    //holds the dropdown, dropdown's selected choice, and arrow
    let div = document.createElement('div');
    div.className = "arrow-container flex-container-row"; 
    let arrow = document.createElement('span');
    arrow.className = "right-arrow";
    arrow.innerHTML = "&#8250;";
    let span = document.createElement('span');
    span.className = "choice-display";
    span.dataset.for = extractName(dropdown.languagedetail_key); 
    //dropdown - we use a <ul> instead of <select> because we need to do some customization that a <select> tag won't be able to support
    let backscreen = document.createElement('div');
    backscreen.className = "backscreen display-none"; 
    let select = document.createElement('ul');
    select.id = extractName(dropdown.languagedetail_key);
    select.className = "floating-dropdown-container"; 
    //append elements
    div.appendChild(span);
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
      for (let dropdownData of hierarchies.lev3) {
        if (extractName(dropdownData.languagedetail_key) === key) {
          let dropdown = document.getElementById(extractName(dropdownData.languagedetail_key)); 
          //we use a <li> instead of <option> because we need to do some customization that an <option> tag won't be able to support
          let option = document.createElement('li'); 
          option.className = "single-item-dropdown-option"; 
          option.dataset.value = item[extractName(dropdownData.languagedetail_key)].id;
          option.textContent = item[extractName(dropdownData.languagedetail_key)].descr;
          option.dataset.article = item.article; 
          // option.dataset.venitem = item.colr_c; //todo - is this correct? 
          //make the dropdown display show the selected / default choice
          if (selectedArticle === item.article) {
            document.getElementById('product-detail-view').querySelector(`span[data-for="${extractName(dropdownData.languagedetail_key)}"]`).dataset.value = option.dataset.value; 
            document.getElementById('product-detail-view').querySelector(`span[data-for="${extractName(dropdownData.languagedetail_key)}"]`).textContent = option.textContent; 
          }
          //only include unique options don't include duplicates
          let optionCollection = dropdown.children; 
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
  //highlight chosen / default option by adding a checkmark 
  let allDropdowns = document.querySelectorAll('#single-item-dropdown-container .dropdown-container');
  for (let dropdown = 0; dropdown < allDropdowns.length; dropdown++) {
    let display = allDropdowns[dropdown].querySelector('.choice-display'); 
    if (display.textContent.trim() !== "") {
      let dropdownOptions = allDropdowns[dropdown].querySelector('.floating-dropdown-container').children;
      for (let option = 0; option < dropdownOptions.length; option++) {
        if (dropdownOptions[option].textContent === display.textContent) {
          dropdownOptions[option].classList.add('selected'); 
        }
      } 
    }
  }
  //make the remaining dropdowns' options reflect their status (greyed out or not based on the first dropdown's choice) 
  let firstDropdownValue = document.querySelector('#single-item-dropdown-container .dropdown-container .choice-display').dataset.value; 
  let firstDropdownDefaultChoice = document.querySelector(`#single-item-dropdown-container .dropdown-container .floating-dropdown-container li[data-value="${firstDropdownValue}"]`); 
  assignSingleProductDropdownOptionStatus(data, firstDropdownDefaultChoice); 
};