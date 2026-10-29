export const DEFAULT_WHATSAPP_TEMPLATES = {
    whatsapp_template_promo_lead:
        "Salam ! Merci pour votre intérêt pour nos livres sur PetsUnivers.\nVoici votre code promo de -{discount}% immédiat : *{promoCode}*.\nUtilisez-le dès maintenant pour finaliser votre commande : {siteUrl}/fr/cart",

    whatsapp_template_order_confirm:
        "Salam {customerName} !\nVotre commande PetsUnivers #{orderId} d'un montant de {total} DH est bien confirmée.\nArticles inclus :\n{itemsList}\nLivraison prévue à : {city} (Paiement à la livraison - COD).\nSuivre votre commande : {trackingUrl}",

    whatsapp_template_abandoned_cart:
        "Salam {customerName} !\nVous avez laissé des articles dans votre panier sur PetsUnivers :\n{itemsList}\nProfitez de -10% immédiats avec le code *{promoCode}* pour finaliser vos achats : {cartUrl}",

    whatsapp_template_welcome:
        "Salam {customerName} ! Merci de contacter petsunivers.ma 📚. Nous avons bien reçu votre message et un conseiller vous répondra très rapidement.\nDécouvrez nos livres du moment sur : {siteUrl}"
}
