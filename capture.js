//////////////
//PAGE INFO//
////////////

const pageUrl = window.location.href; 
const urlParams = new URLSearchParams(pageUrl);
const store = urlParams.get('store');
const masterCoupon = urlParams.get('parent');
//const masterCoupon = 5555111190;
let couponData; 
let customerData; 
const client = document.getElementById('clientName').value; 
const initialHeight = window.innerHeight;
let fieldData;

//get OS
let operatingSystem; 
const userAgent = navigator.userAgent || navigator.vendor || window.opera;
if (/android/i.test(userAgent)) {
  operatingSystem = "android";
}
else if (/iPhone|iPod/.test(userAgent) && !window.MSStream) {
  operatingSystem = "ios";
}
else if (/iPad/.test(userAgent) && !window.MSStream) {
  operatingSystem = "ipad";
}	

////////////
//METHODS//
//////////

const validateEmail = (email) => {
  let re = /\S+@\S+\.\S+/;
  return re.test(email);
};
const showSpinner = () => {
  let spinner = document.createElement('div');
  spinner.className = "spinner";
  spinner.innerHTML = "<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>"; 
  document.querySelector('.spinner-container').appendChild(spinner); 
  document.querySelector('.spinner-container').classList.remove('display-none'); 
  document.querySelector('.button-title').classList.add('display-none');
  document.getElementById('submit-customer-capture-button').classList.add('loading');
};

const hideSpinner = () => {
  if (document.querySelector('.spinner')) {
    document.querySelector('.spinner').remove(); 
  }
  document.querySelector('.spinner-container').classList.add('display-none'); 
  document.querySelector('.button-title').classList.remove('display-none');
  document.getElementById('submit-customer-capture-button').classList.remove('loading');
  document.getElementById('submit-customer-capture-button').classList.remove('loading');
}; 

const collectCustomerDetails = () => {
  let inputs = document.querySelectorAll('.controls input');
  let details = {missing:[], isEmailValid:null};
  for (let input of inputs) {
    details[input.name] = input.value;
    //remove any previous red border on an input
    input.classList.remove('border-red');
    //if any input is required and is missing a value higlight it
    if (input.hasAttribute("required") && input.value.trim() === "") {
      input.classList.add('border-red');
      details.missing.push(input); 
    } 
    if (input.name === "email") {
      details.isEmailValid = validateEmail(input.value); 
    }
  } 
  return details; 
};

const addCustomerCall = (xhr, status, args) => {
  //clear error message
  document.querySelector('.error-message').textContent = "";
  console.log("************** ADD CUSTOMER **************");
  console.log("xhr",xhr);
  console.log("args",args.result);
  console.log("status", status);
  if (status == "success") {
    customerData = args.result;
    if (customerData.hasOwnProperty('result')) {
      if(customerData.statusCode === 0) {
        //make call to get coupon
        let getCouponBody = {
          masterCoupon: masterCoupon,
          customerNumber: customerData.result.id,
          creator: 'app clip',
          // date: new Date().toISOString(), //todo - syju hasn't gotten back to me about the format
           store: store
        }; 
        document.getElementById('webClipQueryParam').value = JSON.stringify(getCouponBody); 
        document.getElementById('createSingleUseCoupon').click(); 
      }
      else {
        document.querySelector('.error-message').textContent = `Please try again! Customer not created.`; 
        hideSpinner(); 
      }
    }
  }
  else {
    document.querySelector('.error-message').textContent = `Please try again! ${xhr.statusText}`; 
    console.error(xhr.statusText);
    hideSpinner();
  }
};

const filterCustomerCall = (xhr, status, args) => {
  console.log("************** FILTER CUSTOMER **************");
  console.log("xhr", xhr);
  console.log("args", args.result);
  console.log("status", status);
  if(status == "success") {
    let data = args.result.result;
    //customer already exists
    if (data.hasOwnProperty("entity") && data.entity.length >= 1) {
      document.querySelector('.error-message').textContent = `An account with this email address already exists. Please try a different email address.`; 
      hideSpinner(); 
    }
    //new customer so they are added 
    else {
      let details = collectCustomerDetails(); 
      delete details.missing;
      delete details.isEmailValid; 
      details.home_store = store;
      details.crm_field_20 = store; 
      document.getElementById('addCustJson').value = JSON.stringify(details);
      document.getElementById('addCustomer').click(); 
    }
  }
  else {
    document.querySelector('.error-message').textContent = `Please try again! ${xhr.statusText}`; 
    console.error(xhr.statusText);
    hideSpinner();
  }
};

const shareQRCode = async () => {
  let imageUrl = document.querySelector('#qrcode-container img').src;
  //qrcode library that we use renders a canvas with the qrcode for android 2.1 or greater so we must grab the uri from the canvas
  if (operatingSystem === "android") {
	imageUrl = document.querySelector('canvas').toDataURL();
  }
  const blob = await(await fetch(imageUrl)).blob();
  const filesArray = [
    new File(
      [blob],
      `${client.replace(/[^\w ]/g, '')}-coupon-${couponData.id.replace(/[^\w ]/g, '')}.png`,
      {
        type: blob.type,
        lastModified: new Date().getTime()
      }
    )
  ];
  if (navigator.canShare && navigator.canShare({ files: filesArray })) {
    navigator.share({
      title: document.getElementById('coupon-number').value,
      text: document.getElementById('coupon-number').value,
      files: filesArray
    })
    .then(() => console.log('Share was successful.'))
    .catch(error => {
      console.error(error);
    });
  } 
  else {
    document.querySelector('.error-message').textContent = `Your system doesn't support file sharing.`;
  }
};

const downloadQRCode = async () => {
  let a = document.createElement('a');  
  a.setAttribute('target', 'empty_frame');
  if (operatingSystem === "android") {
  	a.href = document.querySelector('canvas').toDataURL();
  }
  else {
    const imageUrl = document.querySelector('#qrcode-container img').src; 
    const blob = await(await fetch(imageUrl)).blob();
    console.log('blob', blob);
    a.href = window.URL.createObjectURL(blob);;
  }
  a.download = `${client.replace(/[^\w ]/g, '')}-coupon-${couponData.id.replace(/[^\w ]/g, '')}.png`;
  document.body.appendChild(a); 
  a.click();    
  a.remove();
};

const getCoupon = (xhr, status, args) => {
  console.log("************** GET COUPON **************");
  console.log("xhr",xhr);
  console.log("args",args.result);
  console.log("status", status);
  if (status == "success") {
    if (args.result !== undefined) {
      let data = JSON.parse(args.result);
      //reveal coupon
      if (data.statusCode === 0) {
        //store reference to coupon data
        couponData = data.result.singleusecoupon;
        //use QR code library to generate QR Code. Library documentation at https://davidshimjs.github.io/qrcodejs/
        let qrcode = new QRCode(document.getElementById("qrcode-container"), {
          text: couponData.description,
          width: 150,
          height: 150,
        });
        qrcode.makeCode(JSON.stringify({customer: customerData.result.id, offer: couponData.id})); 
        //populate details for customer coupon
        document.getElementById('customer-number').textContent = customerData.result.id; 
        document.getElementById('coupon-title').textContent = couponData.description; 
        document.getElementById('coupon-expiration').textContent = couponData.expiryDate; 
        document.getElementById('coupon-number').textContent = couponData.id; 
        document.querySelector('.page-title').textContent = "Sign Up Complete";
        document.getElementById('controls-container').classList.add('display-none');
        document.getElementById('submit-button-container').classList.add('display-none');
        document.getElementById('coupon-details').classList.remove('display-none');
        document.getElementById('share-qr-container').classList.remove('display-none');
        if (navigator.canShare) { 
          document.querySelector('#share-qr-container').addEventListener('click', shareQRCode);
          document.querySelector('#share-qr-container button').innerHTML = '<i id="share-logo" class="fa-solid fa-arrow-up-from-bracket"></i>Share QR Code';
        }
        else {
          document.querySelector('#share-qr-container').addEventListener('click', downloadQRCode); 
        }
        //if IOS also show Apple Wallet button and appropriate share icon
        if (operatingSystem === "ios") {
          document.getElementById('apple-wallet-container').classList.remove('display-none');
        }
      }
      //show error message
      else {
        document.querySelector('.error-message').textContent = data.result.message; 
      }
    }
    else {
      document.querySelector('.error-message').textContent = `No coupon returned!`;  
    }
    hideSpinner(); 
  }
  else {
    document.querySelector('.error-message').textContent = `Please try again! ${xhr.statusText}`; 
    console.error(xhr.statusText);
  }
};

////////////////////
//EVENT LISTENERS//
//////////////////

document.getElementById('submit-customer-capture-button').addEventListener('click', () => {
   //clear error message
  document.querySelector('.error-message').textContent = ""; 
  let details = collectCustomerDetails(); 
  if (details.missing.length > 0) {
    document.querySelector('.error-message').textContent = "Required fields are missing."; 
  }
  else if (details.isEmailValid === false) {
    document.querySelector('.error-message').textContent = "Invalid Email."; 
    document.querySelector('input[name="email"]').classList.add('border-red'); 
  }
  else {
    document.getElementById('filterCustJson').value = JSON.stringify({email: document.querySelector('input[name="email"]').value}); 
    showSpinner(); 
    document.getElementById('filterCustomer').click(); 
  }
});  

document.getElementById('apple-wallet-button').addEventListener('click', () => {
  //clear error message
  document.querySelector('.error-message').textContent = "";
  let date = document.getElementById('coupon-expiration').textContent;
  let a = document.createElement('a');
  a.setAttribute('target', 'empty_frame');
  a.href = `https://us-central1-cloud-9-pos.cloudfunctions.net/createPass?client=${encodeURIComponent(client)}&customer=${encodeURIComponent(couponData.customer)}&description=${encodeURIComponent(couponData.description)}&expiration=${`${date} 23:59:59`}`;
  // a.download = `${document.getElementById('coupon-number').textContent}.pkpass`;
  a.setAttribute('download', '');
  document.body.appendChild(a);
  a.click();    
  a.remove();
  document.querySelector('.error-message').textContent = `Apple Wallet file downloaded.`;    
});

//to handle keyboard shrinking the height of the viewable space on android
if (operatingSystem === "android") {
  window.addEventListener('resize', () => {
    if(window.innerHeight < initialHeight && window.innerWidth < 800){
    // if(window.innerHeight < initialHeight){
      document.querySelector('body').classList.remove('height-100');
    }
    else {
      document.querySelector('body').classList.add('height-100');
    }
  });
}

///////////////////
//INITIALIZATION//
/////////////////

document.querySelector('body').classList.add('height-100'); 

const createInput = (control, isEmailIncluded) => {
  //create input container and additional elements 
  let container = document.createElement('div'); 
  let label = document.createElement('label'); 
  label.textContent = control.label;
  label.setAttribute('for', control.id); 
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
    input.name = "business_name"; 
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
    input.type = "hidden";
  }
  else {
	container.appendChild(label);
  }

  container.appendChild(input);
  document.querySelector('.controls > div').appendChild(container); 
}; 

window.addEventListener('load', () => {
  checkPermission(); 
  //get rptpars info
  if (store !== null) {
    document.getElementById('webClipQueryParam').value = JSON.stringify({storeId: store});
  }
  showSpinner();
  document.getElementById('rptpars').click();
});

const rptparsCall = (xhr, status, args) => {
  console.log("************** RPTPARS **************"); 
  console.log("xhr",xhr);
  console.log("args",args.result);
  console.log("status", status);
  let errorMessageContainer = document.createElement('h4');
  errorMessageContainer.className = "color-red";
  
  if (status == "success") {
     if (args.hasOwnProperty('result')) {
       fieldData = JSON.parse(args.result).result.inputField; 
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
           let label = document.createElement('label'); 
           label.textContent = "Email";
           label.setAttribute('for', 'email_cp'); 
           let input = document.createElement('input'); 
           input.className = "control";
           input.id = "email_cp";
           input.type = "email";
           input.placeholder = "Email";
           input.name = "email";
           input.required = "true"; 
           container.appendChild(input);
           document.querySelector('.controls > div').appendChild(container); 
         }
         document.querySelector('main').classList.remove('display-none'); 
       }
       //no results returned
       else {
         errorMessageContainer.textContent = "No results returned!"; 
         document.querySelector('main').prepend(errorMessageContainer); 
       }
       hideSpinner();    
     }
  }
  else {
    errorMessageContainer.textContent = `Error! ${xhr.statusText}`; 
    document.querySelector('main').prepend(errorMessageContainer); 
    console.error(xhr.statusText);
    hideSpinner();
  }
}; 