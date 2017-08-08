'use strict';

(function () {
  var AUTH = 'production_d8q6ttz5_3rk9vrrxf8qmqfwh';
  var applePay;

  function showError(heading, message) {
    var errorDiv = document.querySelector('#error-container');

    errorDiv.querySelector('h3').textContent = heading;
    errorDiv.querySelector('p').textContent = message;
    errorDiv.style.display = 'block';
  }

  function showApplePayButton (applePay) {
    var applePayButton = document.getElementById('apple-pay-button');

    applePayButton.style.display = 'block';

    applePayButton.addEventListener('click', function (event) {
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        event.returnValue = false;
      }

      var paymentRequest = {
        total: {
          label: 'My Company',
          amount: '0.01'
        },
        merchantCapabilities: [ 'supports3DS' ],
        requiredShippingContactFields: ['name', 'postalAddress', 'phone', 'email'],
        requiredBillingContactFields: ['name', 'postalAddress', 'phone', 'email']
      };

      paymentRequest = applePay.createPaymentRequest(paymentRequest);

      var session = new ApplePaySession(1, paymentRequest);

      session.oncancel = function (event) {
        console.error('oncancel:', event);
        showError('Session Cancelled', 'Customer cancelled the session.');
      };

      session.onvalidatemerchant = function (event) {
        applePay.performValidation({
          validationURL: event.validationURL,
          displayName: 'JS SDK Integration'
        }).then(function (data) {
          session.completeMerchantValidation(data);
        }).catch(function (err) {
          showError('Validation Failed', JSON.stringify(err));
          console.log('merchant session err:', err, 'event:', event, 'status:', status);
          session.abort();
        });
      }

      session.onpaymentauthorized = function (event) {
        console.log('onpaymentauthorized', arguments);

        applePay.tokenize({
          token: event.payment.token
        }).then(function (tokenizedPayload) {
          console.log('tokenization success:', tokenizedPayload);
          status = ApplePaySession.STATUS_SUCCESS;

          jsdk.writeNonceAndResubmit(null, tokenizedPayload);
        }).catch(function (err) {
          console.log('tokenization error:', err);
          status = ApplePaySession.STATUS_FAILURE;
        }).then(function () {
          session.completePayment(status);
        });
      }

      session.onpaymentmethodselected = function (event) {
        console.log('onpaymentmethodselected', event);
        session.completePaymentMethodSelection({
          type: 'final',
          label: 'item',
          amount: '0.10'
        }, []);
      }

      session.onshippingcontactselected = function (event) {
        console.log('onshippingcontactselected', event);
        session.completeShippingContactSelection(
          ApplePaySession.STATUS_SUCCESS,
          [{label: 'Express', detail: 'Fast', amount: '1.00', identifier: 'identifier?'}],
          {type: 'final', label: 'item', amount: '0.10'},
          []
        );
      }

      session.onshippingmethodselected = function (event) {
        console.log('onshippingmethodselected', event);
        session.completeShippingMethodSelection(
          ApplePaySession.STATUS_SUCCESS,
          {type: 'final', label: 'item', amount: '0.10'},
          []
        );
      }

      session.begin();
    });
  }

  if (!window.ApplePaySession) {
    showError('!window.ApplePaySession', 'Apple Pay is not supported in this browser');
    return;
  }

  if (!window.ApplePaySession.canMakePayments()) {
    showError('!canMakePayments', 'calling window.ApplePaySession.canMakePayments() returned false');
    return;
  }

  braintree.client.create({
    authorization: AUTH
  }).then(function (client) {
    return braintree.applePay.create({
      client: client
    }).then(function (applePayInstance) {
      applePay = applePayInstance;
      return ApplePaySession.canMakePaymentsWithActiveCard(applePay.merchantIdentifier);
    }).then(function (canMakePaymentsWithActiveCard) {
      if (!canMakePaymentsWithActiveCard) {
        showError('!canMakePaymentsWithActiveCard', 'Cannot make payments with active card. You may need to add a card.');
        return;
      }

      return showApplePayButton(applePay);
    });
  }).catch(function (err) {
    showError(err.code, err.message);
  });
})();
