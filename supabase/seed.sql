-- ===========================================================================
-- Casa em Ordem - despensa de exemplo para testar o app
--
-- NAO e uma migration: sao dados de teste. Cole no SQL Editor e execute.
--
-- Seguro rodar mais de uma vez: cada linha so entra se ainda nao existir item
-- com o mesmo nome, entao nada duplica e nada que voce ja cadastrou e tocado.
--
-- Os dados foram montados para exercitar as partes que dependem de contexto:
--
--   - Validades sao relativas a hoje (current_date + N), entao ha itens
--     vencendo em 1, 2 e 3 dias. E o que faz a sugestao de receitas ter o que
--     priorizar, e o dashboard ter o que mostrar em "usar logo".
--   - Varios itens estao abaixo do minimo, para a lista de compras nascer
--     cheia e a estimativa de gasto ter numero de verdade.
--   - Todos tem last_price, entao a estimativa cobre 100% da lista.
--   - Os alimentos combinam entre si: da para fazer omelete, macarrao,
--     frango com batata, vitamina de banana. Se nao combinassem, a IA nao
--     teria como sugerir nada coerente e o teste nao provaria nada.
--
-- Para desfazer, ha um DELETE comentado no fim do arquivo.
-- ===========================================================================

insert into public.stock_items
  (name, category, unit, current_quantity, minimum_quantity, expiration_date, last_price)
select
  v.name, v.category, v.unit, v.current_quantity, v.minimum_quantity,
  v.expiration_date, v.last_price
from (values
  -- ----------------------------------------------------------------- -------
  -- ALIMENTOS - vencendo nos proximos dias (a IA deve priorizar estes)
  -- ------------------------------------------------------------------------
  ('Peito de frango',        'alimento', 'kg',  1.200::numeric, 1.000::numeric, (current_date + 1)::date, 18.90::numeric),
  ('Tomate',                 'alimento', 'kg',  1.000,          0.500,          (current_date + 2),       8.50),
  ('Queijo mussarela',       'alimento', 'kg',  0.400,          0.300,          (current_date + 3),       45.00),
  ('Banana prata',           'alimento', 'un',  6,              4,              (current_date + 3),       0.80),
  ('Leite integral',         'alimento', 'un',  6,              4,              (current_date + 5),       4.99),
  ('Ovos',                   'alimento', 'un',  12,             6,              (current_date + 8),       0.90),
  ('Presunto fatiado',       'alimento', 'kg',  0.300,          0.200,          (current_date + 6),       32.00),
  ('Cenoura',                'alimento', 'kg',  0.800,          0.500,          (current_date + 10),      5.50),
  ('Manteiga',               'alimento', 'kg',  0.100,          0.200,          (current_date + 15),      52.00),

  -- ------------------------------------------------------------------------
  -- ALIMENTOS - despensa seca, sem validade proxima
  -- ------------------------------------------------------------------------
  ('Arroz branco',           'alimento', 'kg',  5.000,          2.000,          null::date,               6.50),
  ('Feijao carioca',         'alimento', 'kg',  2.000,          1.000,          null,                     9.80),
  ('Macarrao espaguete',     'alimento', 'pct', 3,              2,              null,                     4.20),
  ('Batata',                 'alimento', 'kg',  2.000,          1.000,          null,                     6.20),
  ('Cebola',                 'alimento', 'kg',  1.500,          1.000,          null,                     5.90),
  ('Alho',                   'alimento', 'kg',  0.200,          0.100,          null,                     32.00),
  ('Molho de tomate',        'alimento', 'un',  3,              2,              null,                     3.20),
  ('Milho verde em conserva','alimento', 'un',  2,              1,              null,                     4.50),
  ('Acucar refinado',        'alimento', 'kg',  2.000,          1.000,          null,                     4.80),
  ('Sal',                    'alimento', 'kg',  1.000,          0.500,          null,                     2.90),
  ('Aveia em flocos',        'alimento', 'pct', 1,              1,              null,                     7.40),

  -- ------------------------------------------------------------------------
  -- ALIMENTOS - abaixo do minimo (entram sozinhos na lista de compras)
  -- ------------------------------------------------------------------------
  ('Oleo de soja',           'alimento', 'un',  1,              2,              null,                     7.90),
  ('Farinha de trigo',       'alimento', 'kg',  0.500,          1.000,          null,                     5.40),
  ('Cafe em po',             'alimento', 'kg',  0.200,          0.500,          null,                     38.00),
  ('Pao de forma',           'alimento', 'pct', 0,              1,              (current_date + 4),       8.90),
  ('Requeijao',              'alimento', 'un',  0,              1,              null,                     9.50),

  -- ------------------------------------------------------------------------
  -- BEBIDAS
  -- ------------------------------------------------------------------------
  ('Suco de laranja',        'bebida',   'L',   1.000,          2.000,          (current_date + 7),       11.90),
  ('Refrigerante cola',      'bebida',   'L',   4.000,          2.000,          null,                     8.50),

  -- ------------------------------------------------------------------------
  -- LIMPEZA
  -- ------------------------------------------------------------------------
  ('Detergente neutro',      'limpeza',  'un',  2,              3,              null,                     2.80),
  ('Sabao em po',            'limpeza',  'kg',  1.600,          1.000,          null,                     14.90),
  ('Desinfetante',           'limpeza',  'L',   1.000,          1.000,          null,                     6.70),
  ('Esponja de louca',       'limpeza',  'un',  1,              4,              null,                     1.90),
  ('Saco de lixo 50L',       'limpeza',  'pct', 2,              1,              null,                     12.50),

  -- ------------------------------------------------------------------------
  -- HIGIENE
  -- ------------------------------------------------------------------------
  ('Papel higienico',        'higiene',  'pct', 1,              2,              null,                     22.90),
  ('Sabonete',               'higiene',  'un',  5,              3,              null,                     3.20),
  ('Creme dental',           'higiene',  'un',  2,              2,              null,                     6.90),
  ('Shampoo',                'higiene',  'un',  1,              1,              null,                     18.50),

  -- ------------------------------------------------------------------------
  -- FARMACIA
  -- ------------------------------------------------------------------------
  ('Dipirona',               'farmacia', 'cx',  1,              1,              (current_date + 300),     12.90),
  ('Band-aid',               'farmacia', 'cx',  1,              1,              null,                     9.90)
) as v(name, category, unit, current_quantity, minimum_quantity, expiration_date, last_price)
where not exists (
  select 1 from public.stock_items s
   where lower(s.name) = lower(v.name)
);

-- ---------------------------------------------------------------------------
-- Resumo do que ficou no banco
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.stock_items)                              as itens_no_estoque,
  (select count(*) from public.stock_items where category = 'alimento')  as alimentos,
  (select count(*) from public.stock_items where is_below_minimum)       as na_lista_de_compras,
  (select count(*) from public.stock_items
    where expiration_date is not null
      and expiration_date <= current_date + 5)                           as vencendo_em_5_dias;

-- ---------------------------------------------------------------------------
-- Para remover so os itens de exemplo depois do teste, descomente e execute:
-- ---------------------------------------------------------------------------
-- delete from public.stock_items
--  where lower(name) in (
--    'peito de frango','tomate','queijo mussarela','banana prata','leite integral',
--    'ovos','presunto fatiado','cenoura','manteiga','arroz branco','feijao carioca',
--    'macarrao espaguete','batata','cebola','alho','molho de tomate',
--    'milho verde em conserva','acucar refinado','sal','aveia em flocos',
--    'oleo de soja','farinha de trigo','cafe em po','pao de forma','requeijao',
--    'suco de laranja','refrigerante cola','detergente neutro','sabao em po',
--    'desinfetante','esponja de louca','saco de lixo 50l','papel higienico',
--    'sabonete','creme dental','shampoo','dipirona','band-aid'
--  );
