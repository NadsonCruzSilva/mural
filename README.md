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

## Nova versão com limite de 1.500 caracteres

O contrato desta versão aceita até **1.500 valores escalares Unicode** (até 6.000 bytes em UTF-8). O contrato anterior de 280 caracteres não é atualizado nem apagado. A nova implantação terá outro endereço, contador zero e nenhum recado; o histórico antigo não será importado nem exibido no novo mural.

Para começar o novo mural, siga a implantação abaixo usando o **arquivo Mural.sol atualizado**. Troque `VITE_CONTRACT_ADDRESS` e `VITE_DEPLOYMENT_BLOCK` no `.env` pelos valores da **nova** implantação e reinicie a aplicação. Não reutilize o endereço anterior. A interface verifica o limite informado pelo contrato e mostra uma orientação se ainda estiver conectado à versão antiga, antes de enviar publicações.

A configuração antiga foi preservada durante a atualização do código. Só substitua os dados após confirmar a nova implantação na MetaMask. Aumentar a mensagem aumenta o consumo de gas: confira a estimativa da carteira para cada publicação.

## Implantar na Sepolia sem exportar a chave privada

A implantação é assinada na MetaMask pelo [Remix oficial](https://remix.ethereum.org). Não coloque senha, frase de recuperação nem chave privada em nenhum arquivo do projeto. Se já houver um campo `DEPLOYER_PRIVATE_KEY` no seu `.env`, remova-o: ele não é mais utilizado. O projeto aceita a configuração pública em `src/generated/deployment.json`, mas o contrato deve ser compatível com esta versão de 1.500 caracteres. Para substituir a versão antiga de 280, é obrigatória uma nova implantação.

### 1. Implantar com Remix e MetaMask

1. Abra o Remix no mesmo navegador em que a extensão MetaMask está instalada e desbloqueada.
2. Crie um arquivo `Mural.sol` no Remix e copie para ele o conteúdo completo de `contracts/Mural.sol` deste projeto.
3. Em **Solidity Compiler**, selecione **0.8.28**. Nas opções avançadas, use EVM **cancun** e otimização habilitada com **200 runs**, iguais ao projeto. Clique em **Compile Mural.sol**.
4. Na MetaMask, selecione **Ethereum Sepolia** e uma conta com ETH de teste.
5. Abra **Deploy & Run Transactions** no Remix. Em **Environment**, selecione **Browser Extension → MetaMask** (em algumas versões, **Injected Provider - MetaMask**). Autorize a conexão na MetaMask e confira a rede **Sepolia / 11155111** no Remix. Não use Remix VM para a implantação pública.
6. Selecione o contrato **Mural** e deixe **Value = 0 Wei**. O construtor não recebe parâmetros. Clique em **Deploy** e confirme a transação na própria MetaMask.
7. Aguarde a confirmação. Copie o endereço em **Deployed Contracts**. Abra a transação de implantação no [Etherscan Sepolia](https://sepolia.etherscan.io) e anote o **Block** (número do bloco).

Referência: [documentação de implantação do Remix](https://remix-ide.readthedocs.io/en/latest/run.html).

### 2. Conectar a aplicação ao contrato

No `.env`, preencha somente dados públicos:

```dotenv
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_CONTRACT_ADDRESS=ENDERECO_DO_CONTRATO_MURAL
VITE_DEPLOYMENT_BLOCK=NUMERO_DO_BLOCO_DE_IMPLANTACAO
```

Substitua os dois últimos valores pelo endereço `0x...` do **contrato**, e pelo número inteiro do bloco, sem separadores de milhares. Não use o endereço da sua carteira. O RPC deve ser da Ethereum Sepolia e permitir consultas a eventos. O bloco inicial é necessário para encontrar os links das publicações sem consultar todo o histórico da rede.

Execute `npm run dev` (reinicie se já estiver rodando). Abra a aplicação, clique em **Publicar recado → Conectar carteira**, selecione Sepolia e confirme a publicação na MetaMask. Depois confira o recado e o link da transação no mural.

Os campos públicos explícitos do `.env` têm prioridade sobre `src/generated/deployment.json` e sempre selecionam Sepolia. Caso estejam inválidos ou o bloco esteja ausente, a interface mostra instruções de configuração. Se `VITE_CONTRACT_ADDRESS` estiver vazio, usa a configuração gerada existente. Uma configuração gerada pode ser reutilizada apenas se apontar para a versão de 1.500 caracteres.

Cada nova implantação cria um mural vazio e independente. Guarde os dados do contrato antigo caso queira consultá-lo separadamente; os registros não são transferidos. A MetaMask não distribui ETH de teste automaticamente: se necessário, use um faucet de **Ethereum Sepolia**, e não de Base Sepolia.

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

Para usar a implantação local, deixe `VITE_CONTRACT_ADDRESS` e `VITE_DEPLOYMENT_BLOCK` vazios. No `.env`, ajuste `VITE_RPC_URL=http://127.0.0.1:8545` ou remova essa variável para que a implantação local selecione o RPC local automaticamente. Importe na MetaMask uma conta de desenvolvimento exibida pelo Hardhat e configure a rede local com chain ID `31337`, RPC `http://127.0.0.1:8545` e símbolo `ETH`. Essas contas são públicas e servem exclusivamente para o ambiente local. A interface permite adicionar a rede quando necessário. No ambiente local, o botão da transação copia o hash, pois não há Etherscan.

Reiniciar o nó apaga o histórico local. Faça nova implantação, reinicie a interface e limpe a atividade da conta local na MetaMask se o nonce estiver desatualizado. Para voltar à Sepolia, restaure o RPC e informe o endereço do contrato Sepolia e seu bloco no `.env`, ou restaure a configuração gerada anterior.

## Hospedar na Vercel pelo GitHub

1. Envie a versão atual ao repositório do GitHub e, no painel da Vercel, escolha **Add New → Project → Import Git Repository**.
2. Importe o repositório `NadsonCruzSilva/mural`, na branch `main`, com a pasta raiz `./`. O arquivo `vercel.json` define o framework Vite, instalação `npm ci`, build `npm run build` e saída `dist`.
3. Em **Environment Variables**, configure os mesmos valores públicos de `VITE_RPC_URL`, `VITE_CONTRACT_ADDRESS` e `VITE_DEPLOYMENT_BLOCK` usados localmente. Se nenhuma configuração explícita for fornecida, o projeto usa o contrato público registrado em `src/generated/site.json` e o RPC público padrão da Sepolia. Não envie seu `.env` ao GitHub nem configure chave privada na Vercel.
4. Confira o acesso desejado antes de publicar: o link da demonstração precisa permitir que os participantes o abram. Clique em **Deploy** quando estiver pronto para disponibilizar o site ao público escolhido.
5. Após a publicação, abra o link no navegador com MetaMask e faça uma publicação de teste. A carteira deve estar na Ethereum Sepolia, com ETH de teste. O contrato e os recados permanecem na blockchain; trocar a hospedagem não cria um novo mural.

As variáveis `VITE_` são incorporadas no build e são públicas. Se mudar o endereço ou o bloco no painel da Vercel, gere uma nova implantação (**Redeploy**). Novos commits enviados à branch de produção também podem disparar novas implantações após conectar o repositório à Vercel.

Referência: [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite).

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
- Teste um recado com acentos e emojis e o limite de 1.500 caracteres.
- Recarregue a aplicação e confira a transação e o endereço do contrato no explorador.
- Confira em tela de celular e computador, com mural vazio e com recados.

## Contrato e arquitetura

O contrato `Mural` é append-only: não possui proprietário, edição, exclusão, transferência de fundos nem upgrade. A gravação é não pagável; o remetente paga apenas a taxa da rede. O horário vem de `block.timestamp`, e não do relógio do navegador. O conteúdo é renderizado como texto, sem interpretar HTML.

| Interface                                          | Comportamento                                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `publishMessage(string)`                           | Publica de 1 a 1.500 valores escalares Unicode e emite evento.                                             |
| `getMessage(uint256)`                              | Obtém registro por ID, iniciado em 1; ID inválido reverte.                                                 |
| `getMessages(offset, limit)`                       | Ordem crescente por ID, offset iniciado em 0, limite entre 1 e 50. Offset além do fim retorna lista vazia. |
| `MAX_MESSAGE_CHARACTERS()`                         | Retorna o limite de 1.500 caracteres desta versão.                                                         |
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
