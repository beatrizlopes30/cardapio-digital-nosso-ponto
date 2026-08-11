// Dados do cardápio Nosso Ponto
// Cada categoria pode ter "items" diretos e/ou "groups" (subseções com preço próprio)

const WHATSAPP_NUMBER = "5599985516826";

const MENU_DATA = [
  {
    id: "salgados",
    icon: "🥟",
    title: "Salgados",
    subtitle: "R$ 3,50 cada",
    items: [
      { name: "Coxinha de Frango", price: 3.5 },
      { name: "Enroladinho", desc: "Massa enrolada com salsicha", price: 3.5 },
      { name: "Mortadela com Queijo", price: 3.5 },
      { name: "Pastel de Carne (assado)", price: 3.5 },
    ]
  },
  {
    id: "pastelao",
    icon: "🌮",
    title: "Cardápio Pastelão",
    groups: [
      {
        name: "Simples",
        price: 7,
        items: [
          { name: "Carne", desc: "Carne moída" },
          { name: "Calabresa", desc: "Calabresa em cubos" },
          { name: "Pizza", desc: "Queijo, presunto e orégano" },
          { name: "Frango", desc: "Frango desfiado" },
          { name: "Queijo", desc: "Mussarela ou tradicional" },
        ]
      },
      {
        name: "Doce",
        price: 9,
        items: [
          { name: "Doce de Leite", desc: "Doce de leite com queijo" },
          { name: "Romeu e Julieta", desc: "Queijo com goiabada" },
          { name: "Prestígio", desc: "Chocolate, queijo e coco ralado" },
        ]
      },
      {
        name: "Especiais de Carne",
        price: 9,
        items: [
          { name: "Carne com Catupiry" },
          { name: "Carne com Cheddar" },
          { name: "Carne com Queijo" },
        ]
      },
      {
        name: "Especiais de Frango",
        price: 9,
        items: [
          { name: "Frango com Catupiry" },
          { name: "Frango com Cheddar" },
          { name: "Frango com Queijo" },
        ]
      },
      {
        name: "Especiais de Carne de Sol",
        price: 9,
        items: [
          { name: "Carne de Sol com Cheddar" },
          { name: "Carne de Sol com Queijo" },
          { name: "Carne de Sol com Catupiry" },
        ]
      },
      {
        name: "Especiais de Calabresa",
        price: 9,
        items: [
          { name: "Calabresa com Catupiry" },
          { name: "Calabresa com Cheddar" },
          { name: "Calabresa com Queijo" },
        ]
      },
    ]
  },
  {
    id: "pizza",
    icon: "🍕",
    title: "Pizza",
    subtitle: "R$ 7,00 cada",
    items: [
      { name: "Pizza Calabresa", price: 7 },
      { name: "Pizza Frango", price: 7 },
      { name: "Pizza Presunto e Queijo", price: 7 },
    ]
  },
  {
    id: "hamburguer",
    icon: "🍔",
    title: "Hambúrguer",
    items: [
      { name: "X-Tudo", desc: "Pão, hambúrguer, tomate, alface, queijo mussarela, presunto, bacon, salsicha, ovo, milho e batata palha", price: 14 },
      { name: "X-Salada", desc: "Pão, hambúrguer, tomate, alface, queijo mussarela, ovo, milho e batata", price: 11 },
      { name: "X-Calabresa", desc: "Pão, hambúrguer, tomate, alface, queijo mussarela, presunto, bacon, calabresa, salsicha, ovo, milho e batata frita", price: 16 },
      { name: "Misto", desc: "Pão, queijo e presunto", price: 5 },
    ]
  },
  {
    id: "cachorro-quente",
    icon: "🌭",
    title: "Cachorro Quente",
    items: [
      { name: "Cachorro Quente Simples", desc: "Pão, molho, salsicha, milho e batata palha", price: 6 },
      { name: "Cachorrão", desc: "Pão, molho, 2 salsichas, milho e batata palha", price: 7 },
      { name: "Cachorro Quente Especial", desc: "Pão, molho, salsicha, queijo, cheddar, catupiry e batata palha", price: 8 },
    ]
  },
  {
    id: "porcoes",
    icon: "🍟",
    title: "Porções — Batata Frita",
    groups: [
      {
        name: "Simples",
        sizes: [
          { label: "Pequena (P)", price: 10 },
          { label: "Grande (G)", price: 12 },
        ]
      },
      {
        name: "Completa",
        desc: "Com calabresa e cheddar",
        sizes: [
          { label: "Pequena (P)", price: 13 },
          { label: "Grande (G)", price: 15 },
        ]
      },
    ]
  },
  {
    id: "sucos-vitaminas",
    icon: "🥤",
    title: "Vitaminas e Sucos",
    subtitle: "Sabores: Abacate, Acerola, Banana, Cajá, Cupuaçu, Goiaba, Maracujá",
    groups: [
      {
        name: "Vitaminas",
        sizes: [
          { label: "300ml", price: 7 },
          { label: "400ml", price: 8 },
          { label: "500ml", price: 10 },
          { label: "Jarra 1L", price: 14 },
        ]
      },
      {
        name: "Sucos",
        sizes: [
          { label: "300ml", price: 4 },
          { label: "400ml", price: 5 },
          { label: "500ml", price: 6 },
          { label: "Jarra 1L", price: 11 },
        ]
      },
    ]
  },
  {
    id: "guarana-amazonia",
    icon: "🍇",
    title: "Guaraná da Amazônia",
    subtitle: "Sabores: Açaí, Acerola, Banana, Cupuaçu, Farinha Láctea, Goiaba, Maracujá",
    items: [
      { name: "Guaraná da Amazônia 400ml", price: 16 },
      { name: "Guaraná da Amazônia 500ml", price: 18 },
      { name: "Guaraná da Amazônia 700ml", price: 20 },
    ]
  },
  {
    id: "acai",
    icon: "🍨",
    title: "Açaí",
    subtitle: "Monte do seu jeito! Acompanhamentos: leite em pó, leite condensado, granola · Frutas: banana, maçã, uva",
    items: [
      { name: "Açaí 300ml", price: 16 },
      { name: "Açaí 400ml", price: 18 },
      { name: "Açaí 500ml", price: 20 },
    ]
  },
  {
    id: "milkshake",
    icon: "🥛",
    title: "Milk Shake",
    subtitle: "Sabores: Baunilha, Chocolate, Misto, Morango · Coberturas: Caramelo, Chocolate, Leite condensado, Morango",
    items: [
      { name: "Milk Shake 300ml", price: 8 },
      { name: "Milk Shake 400ml", price: 10 },
      { name: "Milk Shake 500ml", price: 12 },
    ]
  },
  {
    id: "sorvete",
    icon: "🍦",
    title: "Sorvete na Casquinha",
    items: [
      { name: "Casquinha", price: 4 },
      { name: "Cascão", price: 6 },
    ]
  },
];
