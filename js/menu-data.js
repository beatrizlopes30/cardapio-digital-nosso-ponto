// Dados do cardápio Nosso Ponto
// Cada categoria pode ter "items" diretos e/ou "groups" (subseções com preço próprio)

const WHATSAPP_NUMBER = "5599985516826";

const MENU_DATA = [
  {
    id: "salgados",
    icon: "🥟",
    title: "Salgados",
    subtitle: "R$ 4,00 cada",
    items: [
      { name: "Coxinha de Frango", price: 4 },
      { name: "Enroladinho", desc: "Massa enrolada com salsicha", price: 4 },
      { name: "Mortadela com Queijo", price: 4 },
      { name: "Pastel de Carne (assado)", price: 4 },
    ]
  },
  {
    id: "pastelao",
    icon: "🌮",
    title: "Cardápio Pastelão",
    groups: [
      {
        name: "Simples",
        price: 9,
        items: [
          { name: "Pastel de Carne", desc: "Carne moída" },
          { name: "Pastel de Calabresa", desc: "Calabresa em cubos" },
          { name: "Pastel de Pizza", desc: "Queijo, presunto e orégano" },
          { name: "Pastel de Frango", desc: "Frango desfiado" },
          { name: "Pastel de Queijo", desc: "Mussarela ou tradicional" },
        ]
      },
      {
        name: "Doce",
        price: 11,
        items: [
          { name: "Pastel de Doce de Leite", desc: "Doce de leite com queijo" },
          { name: "Pastel Romeu e Julieta", desc: "Queijo com goiabada" },
          { name: "Pastel Prestígio", desc: "Chocolate, queijo e coco ralado" },
        ]
      },
      {
        name: "Especiais de Carne",
        price: 11,
        items: [
          { name: "Pastel de Carne com Catupiry" },
          { name: "Pastel de Carne com Cheddar" },
          { name: "Pastel de Carne com Queijo" },
        ]
      },
      {
        name: "Especiais de Frango",
        price: 11,
        items: [
          { name: "Pastel de Frango com Catupiry" },
          { name: "Pastel de Frango com Cheddar" },
          { name: "Pastel de Frango com Queijo" },
        ]
      },
      {
        name: "Especiais de Carne de Sol",
        price: 11,
        items: [
          { name: "Pastel de Carne de Sol com Cheddar" },
          { name: "Pastel de Carne de Sol com Queijo" },
          { name: "Pastel de Carne de Sol com Catupiry" },
        ]
      },
      {
        name: "Especiais de Calabresa",
        price: 11,
        items: [
          { name: "Pastel de Calabresa com Catupiry" },
          { name: "Pastel de Calabresa com Cheddar" },
          { name: "Pastel de Calabresa com Queijo" },
        ]
      },
    ]
  },
  {
    id: "pizza",
    icon: "🍕",
    title: "Mini Pizza",
    subtitle: "R$ 9,00 cada",
    items: [
      { name: "Mini Pizza Calabresa", price: 9 },
      { name: "Mini Pizza Frango", price: 9 },
      { name: "Mini Pizza Presunto e Queijo", price: 9 },
    ]
  },
  {
    id: "hamburguer",
    icon: "🍔",
    title: "Hambúrguer",
    items: [
      { name: "X-Tudo", desc: "Pão, hambúrguer, tomate, alface, queijo mussarela, presunto, bacon, salsicha, ovo, milho e batata palha", price: 16 },
      { name: "X-Salada", desc: "Pão, hambúrguer, tomate, alface, queijo mussarela, ovo, milho e batata", price: 13 },
      { name: "X-Calabresa", desc: "Pão, hambúrguer, tomate, alface, queijo mussarela, presunto, bacon, calabresa, salsicha, ovo, milho e batata frita", price: 18 },
      { name: "Misto", desc: "Pão, queijo e presunto", price: 7 },
    ]
  },
  {
    id: "cachorro-quente",
    icon: "🌭",
    title: "Cachorro Quente",
    items: [
      { name: "Cachorro Quente Simples", desc: "Pão, molho, salsicha, milho e batata palha", price: 8 },
      { name: "Cachorrão", desc: "Pão, molho, 2 salsichas, milho e batata palha", price: 9 },
      { name: "Cachorro Quente Especial", desc: "Pão, molho, salsicha, queijo, cheddar, catupiry e batata palha", price: 10 },
    ]
  },
  {
    id: "porcoes",
    icon: "🍟",
    title: "Porções — Batata Frita",
    groups: [
      {
        name: "Batata Frita Simples",
        desc: "Batata simples com sal.",
        sizes: [
          { label: "Pequena (P)", price: 12 },
          { label: "Grande (G)", price: 14 },
        ]
      },
      {
        name: "Batata Frita Completa",
        desc: "Com bacon, calabresa e cheddar.",
        sizes: [
          { label: "Pequena (P)", price: 15 },
          { label: "Grande (G)", price: 18 },
        ]
      },
    ]
  },
  {
    id: "sucos-vitaminas",
    icon: "🥤",
    title: "Vitaminas e Sucos",
    subtitle: "Sabores: Abacate, Acerola, Banana, Cajá, Cupuaçu, Goiaba, Maracujá",
    flavors: ["Abacate", "Acerola", "Banana", "Cajá", "Cupuaçu", "Goiaba", "Maracujá"],
    groups: [
      {
        name: "Vitamina",
        sizes: [
          { label: "300ml", price: 9 },
          { label: "400ml", price: 10 },
          { label: "500ml", price: 12 },
          { label: "Jarra 1L", price: 18 },
        ]
      },
      {
        name: "Suco",
        sizes: [
          { label: "300ml", price: 6 },
          { label: "400ml", price: 7 },
          { label: "500ml", price: 8 },
          { label: "Jarra 1L", price: 15 },
        ]
      },
    ]
  },
  {
    id: "guarana-amazonia",
    icon: "🍇",
    title: "Guaraná da Amazônia",
    subtitle: "Sabores: Açaí, Acerola, Banana, Cupuaçu, Farinha Láctea, Goiaba, Maracujá · Cobertura e opção com/sem amendoim disponíveis",
    flavors: ["Açaí", "Acerola", "Banana", "Cupuaçu", "Farinha Láctea", "Goiaba", "Maracujá"],
    extraOptions: [
      {
        key: "cobertura",
        label: "Cobertura",
        type: "select",
        required: true,
        placeholder: "Escolha a cobertura",
        options: ["Sem cobertura", "Caramelo", "Chocolate", "Leite condensado", "Morango"]
      },
      {
        key: "amendoim",
        label: "Amendoim",
        type: "select",
        required: true,
        placeholder: "Com ou sem amendoim?",
        options: ["Com amendoim", "Sem amendoim"]
      }
    ],
    items: [
      { name: "Guaraná da Amazônia 400ml", price: 18 },
      { name: "Guaraná da Amazônia 500ml", price: 20 },
      { name: "Guaraná da Amazônia 700ml", price: 22 },
    ]
  },
  {
    id: "acai",
    icon: "🍨",
    title: "Açaí",
    subtitle: "Monte do seu jeito! Acompanhamentos: leite em pó, leite condensado, granola, tapioca · Frutas: banana, maçã, uva",
    extraOptions: [
      {
        key: "frutas",
        label: "Frutas",
        type: "checkbox",
        options: ["Banana", "Maçã", "Uva"]
      },
      {
        key: "acompanhamentos",
        label: "Acompanhamentos",
        type: "checkbox",
        options: ["Leite em pó", "Leite condensado", "Granola", "Tapioca"]
      }
    ],
    items: [
      { name: "Açaí 300ml", price: 18 },
      { name: "Açaí 400ml", price: 20 },
      { name: "Açaí 500ml", price: 22 },
    ]
  },
  {
    id: "milkshake",
    icon: "🥛",
    title: "Milk Shake",
    subtitle: "Sabores: Baunilha, Chocolate, Misto, Morango · Coberturas: Caramelo, Chocolate, Leite condensado, Morango",
    flavors: ["Baunilha", "Chocolate", "Misto", "Morango"],
    items: [
      { name: "Milk Shake 300ml", price: 10 },
      { name: "Milk Shake 400ml", price: 12 },
      { name: "Milk Shake 500ml", price: 14 },
    ]
  },
  {
    id: "sorvete",
    icon: "🍦",
    title: "Sorvete na Casquinha",
    items: [
      { name: "Casquinha", price: 5 },
      { name: "Cascão", price: 7 },
    ]
  },
  {
    id: "bebidas",
    icon: "🧊",
    title: "Bebidas",
    items: [
      {
        name: "Refrigerante Lata",
        desc: "Informe o sabor/marca desejado.",
        price: 5,
        options: [
          {
            key: "sabor-refrigerante",
            label: "Sabor/marca",
            type: "text",
            required: true,
            placeholder: "Ex: Coca-Cola, Guaraná, Fanta..."
          }
        ]
      },
      { name: "Refrigerante 1L Coca-Cola", price: 11 },
      { name: "Refrigerante Retornável", price: 9 },
      { name: "Refrigerante 1L River", price: 8 },
      { name: "Refrigerante 2L River", price: 11 },
      { name: "Refrigerante 2L Coca-Cola", price: 16 },
      { name: "Água sem Gás 500ml", price: 3 },
      { name: "Água com Gás 500ml", price: 4 },
    ]
  },
];

// Para marcar um produto como indisponível (ex: "acabou o salgado"),
// adicione `available: false` no item, tamanho ou grupo desejado. Ex:
// { name: "Coxinha de Frango", price: 4, available: false }
// O produto continua aparecendo no cardápio, mas fica sinalizado como
// indisponível e não pode ser adicionado ao carrinho. Remova o campo
// (ou defina como true) para reativar.
