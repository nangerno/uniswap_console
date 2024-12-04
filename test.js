require('dotenv').config();
const { Web3 } = require('web3');
const { abi : MockUSDCABPI} = require('./MockUSDC.json');
const { abi : FactoryABI } = require('./Factory.json');
const { abi : RouterABI } = require('./Router.json');

const web3 = new Web3(process.env.ALCHEMY_RPC);
const usdcContract1 = new web3.eth.Contract(MockUSDCABPI, process.env.USDC_CONTRACT_ADDRESS1);
const usdcContract2 = new web3.eth.Contract(MockUSDCABPI, process.env.USDC_CONTRACT_ADDRESS2);
const factoryContract = new web3.eth.Contract(FactoryABI, process.env.FACTORY_ADDRESS);
const routerContract = new web3.eth.Contract(RouterABI, process.env.ROUTER_ADDRESS);

web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY);
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);

async function getBalance() {
  const balance1 = await usdcContract1.methods.balanceOf(account.address).call();
  console.log("MockUSDC1: ", balance1);
  const balance2 = await usdcContract2.methods.balanceOf(account.address).call();
  console.log("MockUSDC2: ", balance2);
}
async function addLiquidity() {
  const amount1 = web3.utils.toWei('1000', 'ether');
  const amount2 = web3.utils.toWei('1', 'ether');
  const a = await usdcContract1.methods.approve(routerContract.options.address, amount1).send({ from: account.address });
  const b = await usdcContract2.methods.approve(routerContract.options.address, amount2).send({ from: account.address });
  console.log("approve tx1-->", a.logs[0].transactionHash);
  console.log("approve tx2-->", b.logs[0].transactionHash);
  const nonce = await web3.eth.getTransactionCount(account.address);
  const tx = await routerContract.methods.addLiquidity(
    usdcContract1.options.address, 
    usdcContract2.options.address,
    amount1,
    amount2,
    0,
    0,
    account.address,
    Math.floor(Date.now() / 1000) + 60 * 10,
  ).send({from: account.address, gas: 300000, nonce: nonce});
  console.log('liqudity tx hash------>', tx.logs[0].transactionHash);
}
async function mint(account, amount) {
  const amountWei = web3.utils.toWei(amount.toString(), 'ether');
  await usdcContract1.methods.mint(account, amountWei).send({ from: account });
  await usdcContract2.methods.mint(account, amountWei).send({ from: account });
}
async function swap(account, amount) {
  const amountWei = web3.utils.toWei(amount.toString(), 'ether');
  await usdcContract1.methods.approve(routerContract.options.address, amountWei).send({ from: account });
  path = [usdcContract1.options.address, usdcContract2.options.address];
  const amounts = await routerContract.methods.getAmountsOut(amountWei, path).call();
  console.log("Out amount--->", amounts[1]);
  const tx = await routerContract.methods.swapExactTokensForTokens(
    amountWei, // In
    amounts[1], // Out
    path,
    account,
    Math.floor(Date.now() / 1000) + 60 * 10
  ).send({ from: account, gas: 300000 });
  console.log("swap tx hash---->", tx.logs[0].transactionHash);
}

async function createPair() {
  const gasPrice = await web3.eth.getGasPrice();
  const gasEstimate = await factoryContract.methods.createPair(process.env.USDC_CONTRACT_ADDRESS1, process.env.USDC_CONTRACT_ADDRESS2).estimateGas({ from: account.address });
  const tx = await factoryContract.methods.createPair(process.env.USDC_CONTRACT_ADDRESS1, process.env.USDC_CONTRACT_ADDRESS2).send({
    from: account.address,
    gas: gasEstimate,
    gasPrice: gasPrice
  });
  console.log(tx.logs[0].transactionHash);
}
async function getPair() {
  const pairAddress = await factoryContract.methods.getPair(process.env.USDC_CONTRACT_ADDRESS1, process.env.USDC_CONTRACT_ADDRESS2).call();
  console.log("pair address---->", pairAddress);
}
async function main() {
  // await mint(account.address, 1);
  await getBalance();
  // await createPair();
  await getPair();
  await addLiquidity();
  await swap(account.address, 100);
  await getBalance();
}

main()