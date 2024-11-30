;; Subscription Management Contract
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-NOT-AUTHORIZED (err u1))
(define-constant ERR-INSUFFICIENT-FUNDS (err u2))
(define-constant ERR-SUBSCRIPTION-NOT-FOUND (err u3))
(define-constant ERR-INVALID-SUBSCRIPTION (err u4))

;; Subscription structure
(define-map subscriptions 
  { subscriber: principal, subscription-id: uint }
  {
    merchant: principal,
    amount: uint,
    frequency: uint,  ;; in blocks
    last-payment-block: uint,
    is-active: bool
  }
)

;; Tracks total subscriptions per user
(define-map user-subscription-count 
  principal 
  uint
)

;; Create a new subscription
(define-public (create-subscription 
  (merchant principal) 
  (amount uint) 
  (frequency uint)
)
  (let 
    (
      (current-subscription-count 
        (default-to u0 
          (map-get? user-subscription-count tx-sender)
        )
      )
      (new-subscription-id 
        (+ current-subscription-count u1)
      )
    )
    (map-insert subscriptions 
      {
        subscriber: tx-sender, 
        subscription-id: new-subscription-id
      }
      {
        merchant: merchant,
        amount: amount,
        frequency: frequency,
        last-payment-block: stacks-block-height,
        is-active: true
      }
    )
    (map-set user-subscription-count 
      tx-sender 
      new-subscription-id
    )
    (ok new-subscription-id)
  )
)

;; Process subscription payment
(define-public (process-subscription 
  (subscriber principal) 
  (subscription-id uint)
)
  (let 
    (
      (subscription 
        (unwrap! 
          (map-get? subscriptions 
            {
              subscriber: subscriber, 
              subscription-id: subscription-id
            }
          )
          ERR-SUBSCRIPTION-NOT-FOUND
        )
      )
      (merchant (get merchant subscription))
      (amount (get amount subscription))
      (frequency (get frequency subscription))
    )
    ;; Check if subscription is due
    (asserts! 
      (>= 
        (- stacks-block-height (get last-payment-block subscription)) 
        frequency
      ) 
      ERR-INVALID-SUBSCRIPTION
    )
    
    ;; Transfer payment
    (try! (stx-transfer? amount subscriber merchant))
    
    ;; Update last payment block
    (map-set subscriptions 
      {
        subscriber: subscriber, 
        subscription-id: subscription-id
      }
      (merge subscription { 
        last-payment-block: stacks-block-height 
      })
    )
    
    (ok true)
  )
)

;; Cancel subscription
(define-public (cancel-subscription 
  (subscription-id uint)
)
  (let 
    (
      (subscription 
        (unwrap! 
          (map-get? subscriptions 
            {
              subscriber: tx-sender, 
              subscription-id: subscription-id
            }
          )
          ERR-SUBSCRIPTION-NOT-FOUND
        )
      )
    )
    (map-set subscriptions 
      {
        subscriber: tx-sender, 
        subscription-id: subscription-id
      }
      (merge subscription { 
        is-active: false 
      })
    )
    (ok true)
  )
)

;; Get subscription details
(define-read-only (get-subscription 
  (subscriber principal) 
  (subscription-id uint)
)
  (map-get? subscriptions 
    {
      subscriber: subscriber, 
      subscription-id: subscription-id
    }
  )
)