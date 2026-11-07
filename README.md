# Mural — Palavras que ficam.

Mural público de recados imutáveis para a disciplina de Sistemas Distribuídos. React + TypeScript + Vite, Ethers.js 6, Solidity e Hardhat 3. Interface em português, responsiva, com duas telas: mural e publicação.

![Mural durante a verificação com três recados reais em uma blockchain Hardhat local](docs/mural-local.jpg)

## Estado da entrega

Contrato compilado, implantação e três publicações verificadas em rede local, leitura pelo navegador conferida em celular e computador. A configuração temporária local foi removida para deixar a aplicação pronta para sua implantação Sepolia. A implantação pública e a validação com sua MetaMask ainda dependem da configuração da carteira de testes no seu ambiente, seguindo as instruções abaixo.

Os testes usam Hardhat e carteiras simuladas; nenhum saldo da sua carteira foi utilizado. As dependências de produção passaram na auditoria npm sem alertas. A cadeia de ferramentas de desenvolvimento do Hardhat 3 ainda apresenta alertas transitivos associados ao Zod 3; uma atualização incompatível forçada não foi aplicada.

## Requisitos

- Node.js 22.13 ou superior (recomendado Node 22 LTS) e npm.
- MetaMask instalada no navegador. Para a demonstração pública, selecione **Ethereum Sepolia**, com ETH de teste nessa mesma rede.
- Um RPC Ethereum Sepolia com suporte a leitura e consulta de eventos. O exemplo usa um endpoint público; disponibilidade e limites dependem do provedor.

## Instalação

```sh
npm install
cp .env.example .env
npm run compile
npm run dev
```

Abra o endereço mostrado pelo Vite (normalmente http://localhost:5173). Sem implantação, a interface mostra instruções reais de configuração, sem recados fictícios. A consulta pública não exige MetaMask nem assinatura.

## Implantar na Sepolia

1. No `.env`, configure `SEPOLIA_RPC_URL` e `VITE_RPC_URL` para a **mesma rede Sepolia**. O RPC usado pelo frontend é público para quem acessa o site; use somente credenciais de RPC adequadas a navegador.
2. Configure `DEPLOYER_PRIVATE_KEY` com a chave de uma **carteira dedicada a testes**, com ETH Sepolia. Essa variável é usada apenas pelo script local de implantação; nunca use o prefixo `VITE_` para segredos. O arquivo `.env` está ignorado pelo Git. A interface pede apenas autorização da MetaMask e nunca solicita chave ou frase de recuperação.
3. Execute:

```sh
npm run deploy:sepolia
npm run dev
```

O script aguarda uma confirmação e grava `src/generated/deployment.json` (endereço, chain ID e bloco de implantação) e a ABI em `src/generated/abi.json`. Reinicie o Vite depois da primeira implantação. Cada nova implantação cria um mural vazio e independente; para continuar usando o mesmo mural, preserve a configuração anterior. Não há migração ou proxy de atualização.

4. Abra a aplicação no mesmo navegador da MetaMask. Vá a **Publicar recado**, conecte a carteira e, se necessário, use **Trocar de rede**. Escreva e confirme a transação na MetaMask.
5. Aguarde a confirmação, volte ao mural, recarregue a página e confira o link no [Etherscan Sepolia](https://sepolia.etherscan.io).

A MetaMask não distribui ETH de teste automaticamente. Se o saldo se esgotar, obtenha ETH Sepolia por um faucet e confira se está usando Ethereum Sepolia, e não Base Sepolia ou outra rede.

## Desenvolvimento inteiramente local

No primeiro terminal:

```sh
npm run node
```

No segundo terminal:

```sh
npm run deploy:local
npm run dev
```

No `.env`, ajuste `VITE_RPC_URL=http://127.0.0.1:8545` ou remova essa variável para que a implantação local selecione o RPC local automaticamente. Importe na MetaMask uma conta de desenvolvimento exibida pelo Hardhat e configure a rede local com chain ID `31337`, RPC `http://127.0.0.1:8545` e símbolo `ETH`. Essas contas são públicas e servem exclusivamente para o ambiente local. A interface permite adicionar a rede quando necessário. No ambiente local, o botão da transação copia o hash, pois não há Etherscan.

Reiniciar o nó apaga o histórico local. Faça nova implantação, reinicie a interface e limpe a atividade da conta local na MetaMask se o nonce estiver desatualizado. Para voltar à Sepolia, restaure o RPC no `.env` e a configuração da implantação Sepolia, ou implante outro contrato.

## Verificação

```sh
npm test
npm run test:ui
npm run build
```

Os testes do contrato executam em uma rede Hardhat simulada, sem ETH público. Cobrem autores, eventos, horários, IDs, paginação, limite Unicode e bytes UTF-8 inválidos. Os testes da interface cobrem validação, carteira, mudanças de rede, erros e estados principais.

Roteiro manual na Sepolia:

- Consulte o mural sem conectar a carteira.
- Publique com MetaMask, recuse uma solicitação e tente novamente.
- Troque a conta e a rede; confirme que a interface acompanha a mudança.
- Teste um recado com acentos e emojis e o limite de 280 caracteres.
- Recarregue a aplicação e confira a transação e o endereço do contrato no explorador.
- Confira em tela de celular e computador, com mural vazio e com recados.

## Contrato e arquitetura

O contrato `Mural` é append-only: não possui proprietário, edição, exclusão, transferência de fundos nem upgrade. A gravação é não pagável; o remetente paga apenas a taxa da rede. O horário vem de `block.timestamp`, e não do relógio do navegador. O conteúdo é renderizado como texto, sem interpretar HTML.

| Interface                                          | Comportamento                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `publishMessage(string)`                           | Publica de 1 a 280 valores escalares Unicode e emite evento.                                               |
| `getMessage(uint256)`                              | Obtém registro por ID, iniciado em 1; ID inválido reverte.                                                 |
| `getMessages(offset, limit)`                       | Ordem crescente por ID, offset iniciado em 0, limite entre 1 e 50. Offset além do fim retorna lista vazia. |
| `totalMessages()`                                  | Retorna o contador global.                                                                                 |
| `MessagePublished(id, author, content, timestamp)` | ID e autor indexados; o log fornece o hash da transação.                                                   |

O limite usa **valores escalares Unicode**, iguais a `Array.from(texto).length` no JavaScript: um emoji simples conta como um caractere; combinações de emojis e marcas combinantes podem contar como vários. Espaços e quebras de linha também contam. O contrato verifica UTF-8 estrito para rejeitar sequências inválidas.

As páginas da interface exibem até 20 mensagens, mais recentes primeiro. A leitura de contador e mensagens usa um bloco fixo para manter a paginação consistente enquanto outras pessoas publicam. Use **Atualizar mural** para obter publicações recentes. Eventos são filtrados pelos IDs da página desde o bloco de implantação, com divisão de intervalos quando o provedor limita consultas. Se o RPC falhar ao retornar logs, os recados continuam visíveis e um aviso permite tentar novamente; links nunca são inventados.

Estrutura: `contracts/` contrato; `test/` testes Hardhat; `scripts/` implantação/exportação; `src/` frontend e testes; `src/generated/` ABI e configuração pública. Não há backend nem banco de dados.

## Limites desta versão

- O registro público não garante a veracidade nem a adequação do conteúdo e não deve conter dados sensíveis.
- Uma confirmação libera a mensagem na interface; reorganizações da rede ainda podem acontecer. Atualizar o mural reconcilia a leitura com a rede.
- A disponibilidade de leitura depende do RPC configurado. Para grandes históricos, recomenda-se um provedor com bons limites de consulta de eventos ou um indexador, fora do escopo inicial.
- Hospedagem online e relatório acadêmico não fazem parte desta entrega. O frontend pode ser gerado com `npm run build`, com saída em `dist/`.
