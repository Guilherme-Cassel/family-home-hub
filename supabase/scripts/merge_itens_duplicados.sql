-- ===========================================================================
-- Casa em Ordem - juntar os cadastros duplicados que ficaram para tras
--
-- Correcao de dados pontual, nao uma migracao: roda uma vez, no SQL Editor,
-- para limpar o estrago que a versao antiga de apply_stock_entries deixou
-- (uma foto por pacote virava um cadastro por pacote).
--
-- Antes de rodar, veja o que ele vai fazer com a PREVIA no fim do arquivo.
--
-- Tudo num bloco DO so: o SQL Editor nao garante a mesma conexao entre um
-- statement e o proximo, e uma tabela temporaria criada no primeiro sumia no
-- seguinte. Um bloco unico tambem e uma transacao unica - se qualquer passo
-- falhar, nada muda.
--
-- Como decide:
--   - Grupo = mesmo nome (sem caixa, sem espaco nas pontas) E mesma unidade.
--     Unidade diferente fica de fora de proposito: juntar 2 un com 0,5 kg
--     produz um numero que nao quer dizer nada. Esses casos saem na previa
--     "unidades divergentes" e valem uma olhada a mao.
--   - Sobrevive o mais antigo do grupo, que e exatamente o que a funcao nova
--     escolhe quando uma compra chega sem vinculo.
--   - Saldo do sobrevivente = soma do grupo. Minimo = o maior (mais seguro
--     para a lista de compras). Validade = a mais proxima. Preco = o do item
--     mexido mais recentemente. Observacoes de todos, juntadas.
--   - As movimentacoes dos perdedores sao repontadas antes de apagar, entao
--     o historico do item sobrevivente fica completo e nada some por cascade.
--   - Os ingredientes das receitas em andamento guardam stock_item_id em
--     jsonb, fora do alcance da chave estrangeira: sem repontar, dar baixa
--     numa receita ja iniciada tentaria descontar de um item apagado.
-- ===========================================================================

do $$
declare
  v_grupo      record;
  v_perdedores uuid[];
  v_quantidade numeric;
  v_minimo     numeric;
  v_validade   date;
  v_preco      numeric;
  v_notas      text;
  v_juntados   integer := 0;
  v_apagados   integer := 0;
begin
  for v_grupo in
    select lower(trim(name)) as chave,
           unit,
           (array_agg(id order by created_at, id))[1] as manter,
           array_agg(id order by created_at, id)      as todos
      from public.stock_items
     group by lower(trim(name)), unit
    having count(*) > 1
  loop
    v_perdedores := array_remove(v_grupo.todos, v_grupo.manter);

    -- Os numeros do grupo inteiro, colhidos antes de apagar qualquer coisa.
    select sum(current_quantity),
           max(minimum_quantity),
           min(expiration_date),
           (array_agg(last_price order by updated_at desc)
              filter (where last_price is not null))[1],
           string_agg(distinct nullif(trim(notes), ''), ' | ')
      into v_quantidade, v_minimo, v_validade, v_preco, v_notas
      from public.stock_items
     where id = any(v_grupo.todos);

    -- 1. Historico passa para o sobrevivente. O trigger de saldo so dispara
    --    em insert, entao isto nao mexe em current_quantity - quem cuida
    --    disso e o passo 3.
    update public.stock_movements
       set stock_item_id = v_grupo.manter
     where stock_item_id = any(v_perdedores);

    -- 2. Receitas em andamento apontando para um duplicado que vai sumir.
    update public.recipe_sessions s
       set ingredients = novo.ingredientes
      from (
        select s2.id,
               jsonb_agg(
                 case
                   when nullif(ing.valor ->> 'stock_item_id', '')::uuid = any(v_perdedores)
                     then jsonb_set(ing.valor, '{stock_item_id}', to_jsonb(v_grupo.manter))
                   else ing.valor
                 end
                 order by ing.pos
               ) as ingredientes
          from public.recipe_sessions s2
          cross join lateral jsonb_array_elements(s2.ingredients)
            with ordinality as ing(valor, pos)
         group by s2.id
      ) novo
     where s.id = novo.id
       and s.ingredients is distinct from novo.ingredientes;

    -- 3. O sobrevivente recebe o que era do grupo inteiro.
    update public.stock_items
       set current_quantity = v_quantidade,
           minimum_quantity = v_minimo,
           expiration_date  = v_validade,
           last_price       = coalesce(v_preco, last_price),
           notes            = nullif(v_notas, '')
     where id = v_grupo.manter;

    -- 4. Os duplicados vao embora. Nada mais aponta para eles.
    delete from public.stock_items where id = any(v_perdedores);

    v_juntados := v_juntados + 1;
    v_apagados := v_apagados + array_length(v_perdedores, 1);

    raise notice '% (%): % cadastros viraram 1, saldo %',
      v_grupo.chave, v_grupo.unit, array_length(v_grupo.todos, 1), v_quantidade;
  end loop;

  raise notice 'Pronto: % grupos juntados, % cadastros apagados.',
    v_juntados, v_apagados;
end $$;

-- ===========================================================================
-- PREVIA - rode estas tres antes, cada uma sozinha. Nenhuma altera nada.
-- ===========================================================================

-- 1. O que vai ser juntado, e em quem.
-- select lower(trim(name)) as nome, unit as unidade, count(*) as cadastros,
--        sum(current_quantity) as saldo_final,
--        (array_agg(id order by created_at, id))[1] as sobrevivente
--   from public.stock_items
--  group by lower(trim(name)), unit
-- having count(*) > 1
--  order by nome;

-- 2. Mesmo nome, unidades diferentes: o script NAO encosta nestes.
-- select lower(trim(name)) as nome,
--        array_agg(distinct unit) as unidades,
--        array_agg(id) as ids
--   from public.stock_items
--  group by lower(trim(name))
-- having count(distinct unit) > 1;

-- 3. Nomes que so diferem por acento tambem ficam de fora, aqui e na funcao
--    de entrada. Se aparecer algo nesta lista, e caso de renomear a mao.
-- select translate(lower(trim(name)),
--                  'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') as nome,
--        array_agg(distinct name) as variantes
--   from public.stock_items
--  group by 1
-- having count(distinct lower(trim(name))) > 1;
