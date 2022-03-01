////////////
//METHODS//
//////////

//fontawesome, use github to host and then test apple wallet - test

function submitReportOnEvent(data) {
  console.log("data",data);
  if (data.status == "begin") {
        console.log("submit begin");   
  }
  
  if (data.status == "success") {
    console.log("submit successs");    
  }

  if (data.status == "complete") {
    console.log("data response", data.responseText);
    var resultJson = data.responseText;
    console.log("SUBMIT COMPLETE",resultJson); 
  }
}

const validateEmail = (email) => {
  let re = /\S+@\S+\.\S+/;
  return re.test(email);
}
const showSpinner = () => {
  let spinner = document.createElement('div');
  spinner.className = "spinner";
  spinner.innerHTML = "<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>"; 
  document.querySelector('.spinner-container').appendChild(spinner); 
  document.querySelector('.spinner-container').classList.remove('display-none'); 
  document.querySelector('.button-title').classList.add('display-none');
  document.getElementById('submit-customer-capture-button').classList.add('loading');
}

const hideSpinner = () => {
  if (document.querySelector('.spinner')) {
    document.querySelector('.spinner').remove(); 
  }
  document.querySelector('.spinner-container').classList.add('display-none'); 
  document.querySelector('.button-title').classList.remove('display-none');
  document.getElementById('submit-customer-capture-button').classList.remove('loading');
  document.getElementById('submit-customer-capture-button').classList.remove('loading');
}

const createInput = (control, isEmailIncluded) => {
  //create input container and additional elements 
  let container = document.createElement('div'); 
  container.className = "flex-container-row align-items-center justify-content-space-between grey-border-bottom";
  let label = document.createElement('label'); 
  label.textContent = control.label
  label.setAttribute('for', control.id); 
  let clearInputButton = document.createElement('button');
  clearInputButton.type = "button"; 
  clearInputButton.className = "clear-input-button"; 
  clearInputButton.textContent = "X"; 
  //create specific input fieldType
  let input = document.createElement('input'); 
  input.className = "control";
  if (control.fieldType === "TextInputField") {
    input.type = "text";
    //set input to email type for email fields
    if (control.id === "email_cp") {
      input.type = "email";
      isEmailIncluded.isEmailIncluded = true;  
    } 
    input.value = control.defaultText; 
  }
  else if (control.fieldType === "NumericInputField") {
    input.type = "number"; 
    input.value = control.defaultNumber; 
  }
  else if (control.fieldType === "DenominationInputField") {
    input.type = "number"; 
    input.value = control.defaultQty; 
  }
  else if (control.fieldType === "SelectionInputField") {
    clearInputButton.classList.add('display-none'); 
    if (Array.isArray(control.items) && control.items.length > 0) {
      // input = document.createElement('datalist'); 
      input = document.createElement('select');
      input.className = "control"; 
      for (let item of control.items) {
        let option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        if(item === control.defaultSelectedItem) {
          option.setAttribute('selected', 'selected'); 
        }
        input.appendChild(option);
      }
    }
    else {
      input.classList.add('display-none');
    }
  }
  else if (control.fieldType === "DateInputField") {
    input.type = "date";
    input.value = control.defaultText; 
    clearInputButton.classList.add('display-none'); 
  }
  input.id = control.id;
  input.placeholder = control.label; 
  //assign input.name for use in assembling the body of the customer capture API call
  if (control.id === "num_cp") {
    input.name = "id"; 
  }
  else if (control.id === "fn_cp") {
    input.name = "first"; 
  }
  else if (control.id === "ln_cp") {
    input.name = "last"; 
  }
  else if (control.id === "add_cp") {
    input.name = "address"; 
  }
  else if (control.id === "add1_cp") {
    input.name = "address2"; 
  }
  else if (control.id === "ct_cp") {
    input.name = "city"; 
  }
  else if (control.id === "st_cp") {
    input.name = "state"; 
  }
  else if (control.id === "zip_cp") {
    input.name = "zip"; 
  }
  else if (control.id === "cn_cp") {
    input.name = "country"; 
  }
  else if (control.id === "tel1_cp" || control.id === "tel_cp") {
    input.name = "phone";
    input.type = "tel";  
  }
  else if (control.id === "tel2_cp") {
    input.name = "bphone";
    input.type = "tel";  
  }
  else if (control.id === "tel3_cp") {
    input.name = "phone3";
    input.type = "tel";  
  }
  else if (control.id === "tel4_cp") {
    input.name = "phone4";
    input.type = "tel";  
  }
  else if (control.id === "email_cp") {
    input.name = "email"; 
  }
  else if (control.id === "birth_cp") {
    input.name = "birth_date"; 
  }
  else if (control.id === "opt_cp") {
    input.name = "email_opt_in"; 
  }
  else if (control.id === "telopt_cp") {
    input.name = "phone_opt_in";
    input.type = "tel";  
  }
  else if (control.id === "addopt_cp") {
    input.name = "address_opt_in"; 
  }
  else if (control.id === "busnam_cp") {
    business_name = "first"; 
  }
  else if (control.id === "cmts_cp") {
    input.name = "crm_notes"; 
  }
  //assign input options
  if (!control.isEditable) {
    input.setAttribute('disabled', 'disabled');
  }
  if (control.isRequired) {
    input.required = "true"; 
  }
  if (control.isHidden) {
    input.classList.type = "hidden";
  }
  //append to DOM
  container.appendChild(label);
  container.appendChild(input);
  // container.appendChild(clearInputButton); 
  document.querySelector('.controls fieldset').appendChild(container); 
}

const collectCustomerDetails = () => {
  let inputs = document.querySelectorAll('.controls input');
  let details = {missing:[], isEmailValid:null};
  for (let input of inputs) {
    details[input.name] = input.value;
    //remove any previous red border on an input
    input.classList.remove('border-red');
    //if any input is required and is missing a value higlight it
    if (input.hasAttribute("required") & input.value.trim() === "") {
      input.classList.add('border-red');
      details.missing.push(input); 
    } 
    if (input.name === "email_cp") {
      details.isEmailValid = validateEmail(input.value); 
    }
  } 
  return details; 
}

const addCustomer = () => {
  //clear error message
  document.querySelector('.error-message').textContent = "";
  console.log("add customer data",data);
  if(data.status == "begin") {
    showSpinner(); 
  }
  else if(data.status == "success") {
    // data = JSON.parse(data.responseText);
    // if (data.hasOwnProperty('result')) {
    //   if(data.result.message === "Customer created successfully") {
    //     //make call to get coupon
    //     let getCouponBody = {
    //       masterCoupon: masterCoupon,
    //       customer: data.result.id,
    //       creator: 'app clip',
    //       date: new Date().toISOString().split('T')[0],
    //       store: storeId
    //     }
    //     document.getElementById('createSingleUseCoupon').value = JSON.stringify(getCouponBody)
    //     document.getElementById('createSingleUseCoupon').click(); 
    //     // getCoupon(data); 
    //   }
    //   else {
    //     document.querySelector('.error-message').textContent = `Please try again! Customer not created.`; 
    //     hideSpinner(); 
    //   }
    // }
  }
  else if (data.status == "error") {
    document.querySelector('.error-message').textContent = `Please try again! ${error}`; 
    console.error(error);
    hideSpinner();
  }
  else if(data.status == "complete") {
    data = JSON.parse(data.responseText);
    //get coupon
    if (data.hasOwnProperty('result')) {
      if(data.result.message === "Customer created successfully") {
        //make call to get coupon
        let getCouponBody = {
          masterCoupon: masterCoupon,
          customer: data.result.id,
          creator: 'app clip',
          date: new Date().toISOString().split('T')[0],
          store: storeId
        }
        document.getElementById('createSingleUseCoupon').value = JSON.stringify(getCouponBody)
        document.getElementById('createSingleUseCoupon').click(); 
        // getCoupon(data); 
      }
      else {
        document.querySelector('.error-message').textContent = `Please try again! Customer not created.`; 
        hideSpinner(); 
      }
    }
  } 
}

const filterCustomer = () => {
  console.log("filter customer data",data);
  if(data.status == "begin") {
    showSpinner(); 
  }
  else if(data.status == "success") {
    data = JSON.parse(data.responseText);
    if (data.result.hasOwnProperty("customers") && data.result.customers.length > 1) {
      document.querySelector('.error-message').textContent = `An account with this email address already exists. Please try a different email address.`; 
      hideSpinner(); 
    }
    else {
      let details = collectCustomerDetails(); 
      document.getElementById('addCustomer').value = JSON.stringify(details)
      document.getElementById('addCustomer').click(); 
      // addCustomer(); 
    }
  }
  else if (data.status == "error") {
    document.querySelector('.error-message').textContent = `Please try again! ${error}`; 
    console.error(error);
    hideSpinner();
  }
  else if(data.status == "complete") {
  } 
}

const shareQRCode = () => {
  if (navigator.canShare && navigator.canShare({ files: filesArray })) {
    navigator.share({
      files: filesArray,
      title: 'Pictures',
      text: 'Our Pictures.',
    })
    .then(() => console.log('Share was successful.'))
    .catch(error => {
      document.querySelector('.error-message').textContent = `Please try again! ${error}`; 
      console.error(error);
    })
  } 
  else {
    document.querySelector('.error-message').textContent = `Your system doesn't support file sharing.`;
  }
}

const getCoupon = (customerData) => {
  // let yourDate = new Date(); 
  console.log("coupon data",data);
  if(data.status == "begin") {
    showSpinner(); 
  }
  else if(data.status == "success") {
    // data = JSON.parse(data.responseText);
    // if (data.hasOwnProperty('result')) {
    //   if (data.result.statusCode === 0) {
    //     // use QR code library to generate QR Code. Library documentation at https://davidshimjs.github.io/qrcodejs/
    //     new QRCode(document.getElementById("qrcode-container"), data.result.singleusecoupon.id);
    //     //populate details for customer coupon
    //     document.getElementById('customer-number').textContent = customerData.id; 
    //     document.getElementById('coupon-title').textContent = data.result.singleusecoupon.description; 
    //     document.getElementById('coupon-expiration').textContent = data.result.singleusecoupon.expiryDate; 
    //     document.getElementById('coupon-number').textContent = data.result.singleusecoupon.id; 
    //     document.querySelector('.page-title').textContent = "Sign Up Complete";
    //     document.getElementById('controls-container').classList.add('display-none');
    //     document.getElementById('coupon-details').classList.remove('display-none');
    //     document.getElementById('share-qr-container').classList.remove('display-none');
    //     //if IOS also show Apple Wallet button and appropriate share icon
    //     if (operatingSystem === "ios") {
    //       document.getElementById('apple-wallet-container').classList.remove('display-none'); 
    //       document.getElementById('QR-logo').className = "fa-solid fa-arrow-up-from-bracket"; 
    //     }
    //     else if (operatingSystem === "android") {
    //       document.getElementById('QR-logo').className = "fa-solid fa-share-nodes"; 
    //     }
    //   }
    //   else {
    //     document.querySelector('.error-message').textContent = data.result.message; 
    //   }
    //   hideSpinner(); 
    // }
  }
  else if (data.status == "error") {
    document.querySelector('.error-message').textContent = `Please try again! ${error}`; 
    console.error(error);
    // hideSpinner();
  }
  else if(data.status == "complete") {
    data = JSON.parse(data.responseText);
    if (data.hasOwnProperty('result')) {
      //reveal coupon
      if (data.result.statusCode === 0) {
        // use QR code library to generate QR Code. Library documentation at https://davidshimjs.github.io/qrcodejs/
        new QRCode(document.getElementById("qrcode-container"), data.result.singleusecoupon.id);
        //populate details for customer coupon
        document.getElementById('customer-number').textContent = customerData.id; 
        document.getElementById('coupon-title').textContent = data.result.singleusecoupon.description; 
        document.getElementById('coupon-expiration').textContent = data.result.singleusecoupon.expiryDate; 
        document.getElementById('coupon-number').textContent = data.result.singleusecoupon.id; 
        document.querySelector('.page-title').textContent = "Sign Up Complete";
        document.getElementById('controls-container').classList.add('display-none');
        document.getElementById('coupon-details').classList.remove('display-none');
        document.getElementById('share-qr-container').classList.remove('display-none');
        //if IOS also show Apple Wallet button and appropriate share icon
        if (operatingSystem === "ios") {
          document.getElementById('apple-wallet-container').classList.remove('display-none'); 
          document.getElementById('QR-logo').className = "fa-solid fa-arrow-up-from-bracket"; 
        }
        else if (operatingSystem === "android") {
          document.getElementById('QR-logo').className = "fa-solid fa-share-nodes"; 
        }
      }
      //show error message
      else {
        document.querySelector('.error-message').textContent = data.result.message; 
      }
      // hideSpinner(); 
    }
    hideSpinner(); 
  } 
}

////////////////////
//EVENT LISTENERS//
//////////////////

document.getElementById('submit-customer-capture-button').addEventListener('click', () => {
   //clear error message
  document.querySelector('.error-message').textContent = ""; 
  let details = collectCustomerDetails(); 
  if (details.missing.length > 0) {
    document.querySelector('.error-message').textContent = "Required fields are missing!"; 
  }
  else if (details.isEmailValid === false) {
    document.querySelector('.error-message').textContent = "Invalid Email!"; 
    document.querySelector('input[name="email_cp"]').classList.add('border-red'); 
  }
  else {
    document.getElementById('filterCustomer').value = JSON.stringify(details); 
    document.getElementById('filterCustomer').click(); 
    // filterCustomer(details);
  }
});  

document.getElementById('customer-capture-form').addEventListener('click', event => {
  if (event.target.matches('.clear-input-button')) {
    event.target.parentNode.querySelector('input').value = ""; 
  }
}); 

document.querySelector('#share-qr-container button').addEventListener('click', shareQRCode); 

document.getElementById('apple-wallet-button').addEventListener('click', () => {
  //clear error message
  document.querySelector('.error-message').textContent = "";
  fetch('https://us-central1-cloud-9-pos.cloudfunctions.net/createPass?client=demo5&customer=123456789')
  .then(response => {
    return response.json();
  })
  .catch(error => {
    document.querySelector('.error-message').textContent = `${error}`; 
    console.error(error);
  })
});

///////////////////
//INITIALIZATION//
/////////////////

const getMobileOperatingSystem = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(userAgent)) {
    return "android";
  }
  else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return "ios";
  }
  return "unknown";
}
const operatingSystem = getMobileOperatingSystem(); 
let fieldData;

window.addEventListener('load', () => {
  let errorMessageContainer = document.createElement('h4');
  //get page url
  let pageUrl = window.location.href; 
  let urlParams = new URLSearchParams(pageUrl);
  let storeId = urlParams.get('storeId');
  let masterCoupon = urlParams.get('parent');
  //get rptpars info
  let rptparsCallBody = {storeId: null}; 
  if (storeId !== null) {
    rptparsCallBody.storeId = storeId; 
  }
  document.getElementById('rptpars').value = JSON.stringify(rptparsCallBody);
  document.getElementById('rptpars').click();
});

const rptparsCall = (data) => {
  console.log("rptpars data",data);
  if(data.status == "begin") {
    showSpinner(); 
  }
  else if(data.status == "success") {
    // data = JSON.parse(data.responseText);
    // if (data.hasOwnProperty('result')) {
    //   fieldData = data.result.inputField; 
    //   console.log("FD", fieldData); 
    //   if(fieldData.length > 0) {
    //     //create form controls for customer capture
    //     let isEmailIncluded = false; 
    //     for (let input of fieldData){
    //       createInput(input, isEmailIncluded);
    //     }
    //     //if email input wasn't included in JSON response add one
    //     if (!isEmailIncluded) {
    //       let container = document.createElement('div');
    //       container.className = "flex-container-row align-items-center justify-content-space-between grey-border-bottom"; 
    //       let label = document.createElement('label'); 
    //       label.textContent = control.label
    //       label.setAttribute('for', control.id); 
    //       let clearInputButton = document.createElement('button');
    //       clearInputButton.type = "button"; 
    //       clearInputButton.className = "clear-input-button"; 
    //       clearInputButton.textContent = "X";   
    //       let input = document.createElement('input'); 
    //       input.className = "control";
    //       input.type = "email";
    //       input.placeholder = "Email";
    //       input.name = "email_cp";
    //       input.required = "true"; 
    //       container.appendChild(input);
    //       container.appendChild(clearInputButton);
    //       document.querySelector('.controls fieldset').appendChild(container); 
    //     }
    //     document.querySelector('main').classList.remove('display-none'); 
    //   }
    //   //no results returned
    //   else {
    //     errorMessageContainer.textContent = "No results returned!"; 
    //     document.querySelector('body').appendChild(errorMessageContainer); 
    //   }
    //   hideSpinner();    
    // }
  }
  else if (data.status == "error") {
    errorMessageContainer.textContent = `Error! ${error}`; 
    document.querySelector('body').appendChild(errorMessageContainer); 
    console.error(error);
    hideSpinner();
  }
  else if(data.status == "complete") {
    data = JSON.parse(data.responseText);
    if (data.hasOwnProperty('result')) {
      fieldData = data.result.inputField; 
      console.log("FD", fieldData); 
      if(fieldData.length > 0) {
        //create form controls for customer capture
        let isEmailIncluded = {isEmailIncluded: false}; 
        for (let input of fieldData){
          createInput(input, isEmailIncluded);
        }
        //if email input wasn't included in JSON response add one
        if (!isEmailIncluded.isEmailIncluded) {
          let container = document.createElement('div');
          container.className = "flex-container-row align-items-center justify-content-space-between grey-border-bottom"; 
          let label = document.createElement('label'); 
          label.textContent = "Email"
          label.setAttribute('for', 'email_cp'); 
          let clearInputButton = document.createElement('button');
          clearInputButton.type = "button"; 
          clearInputButton.className = "clear-input-button"; 
          clearInputButton.textContent = "X";   
          let input = document.createElement('input'); 
          input.className = "control";
          input.type = "email";
          input.placeholder = "Email";
          input.name = "email_cp";
          input.required = "true"; 
          container.appendChild(input);
          container.appendChild(clearInputButton);
          document.querySelector('.controls fieldset').appendChild(container); 
        }
        document.querySelector('main').classList.remove('display-none'); 
      }
      //no results returned
      else {
        errorMessageContainer.textContent = "No results returned!"; 
        document.querySelector('body').appendChild(errorMessageContainer); 
      }
      hideSpinner();    
    }
  } 
}
  //$('#filterCustJson').val(JSON.stringify(jsonVal));
  //console.log("json val",$('#filterCustJson').val());
  //$('#filterCustomer')[0].click();
  
  //$('#addCustJson').val(JSON.stringify(jsonVal));
  //console.log("json val",$('#addCustJson').val());
  //$('#addCustomer')[0].click();
  //$('#createSingleUseCoupon')[0].click();