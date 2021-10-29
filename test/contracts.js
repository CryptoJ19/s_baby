const { expect } = require("chai");
const { ethers } = require("hardhat");
const ERC20ABI = require("../artifacts/contracts/dexfactory.sol/IERC20.json").abi;

const {delay, fromBigNum, toBigNum} = require("./utils.js")

var exchangeRouter;
var exchangeFactory;
var wETH;

var sharkbabyToken;
var sharkToken;
var babyToken;

var stakingPool;

var owner;
var userWallet;

var pancakeswapV2PairContract;
var LPBalance1;

describe("Create UserWallet", function () {
  it("Create account", async function () {
	[owner] = await ethers.getSigners();

	userWallet = ethers.Wallet.createRandom();
	userWallet = userWallet.connect(ethers.provider);
	var tx = await owner.sendTransaction({
		to: userWallet.address, 
		value:ethers.utils.parseUnits("100",18)
	});
	await tx.wait();	
	});
});

describe("Exchange deploy and deploy", function () {

  it("Factory deploy", async function () {
    const Factory = await ethers.getContractFactory("PancakeswapFactory");
    exchangeFactory = await Factory.deploy(owner.address);
    await exchangeFactory.deployed();
	console.log(await exchangeFactory.INIT_CODE_PAIR_HASH())
  });

  it("WETH deploy", async function () {
    const WETH = await ethers.getContractFactory("WETH9");
    wETH = await WETH.deploy();
    await wETH.deployed();
  });
  
  it("Router deploy", async function () {
    const Router = await ethers.getContractFactory("PancakeswapRouter");
    exchangeRouter = await Router.deploy(exchangeFactory.address,wETH.address);
    await exchangeRouter.deployed();
  });

});

describe("Token contract deploy", function () {
	
	it("SHBY Deploy and Initial", async function () {
		const SHARKBABYTOKEN = await ethers.getContractFactory("SHARKBABYOKEN");
		sharkbabyToken = await SHARKBABYTOKEN.deploy();
		await sharkbabyToken.deployed();

		var tx = await sharkbabyToken.setInitialAddresses(exchangeRouter.address);
		await tx.wait();

		//set paircontract 
		var pairAddress = await sharkbabyToken.pancakeswapV2Pair();
		pancakeswapV2PairContract = new ethers.Contract(pairAddress,ERC20ABI,owner);
		
		//shark and baby token 
		const ERC20TOKEN = await ethers.getContractFactory("ERC20");
		sharkToken = await ERC20TOKEN.deploy("AutoShark","SHARK");
		await sharkToken.deployed()

		babyToken = await ERC20TOKEN.deploy("Babyswap","BABY");
		await babyToken.deployed()
	
	});

	it("autoSharktoken and babytoken staking pool deploy and setFeeaddress", async function(){
		//shark pool
		
		const Staking = await ethers.getContractFactory("Staking");
		stakingPool = await Staking.deploy(sharkbabyToken.address, sharkToken.address,babyToken.address);
		await stakingPool.deployed();

		var tx = await stakingPool.setInitialAddresses(exchangeRouter.address);
		await tx.wait();

		//setFeeAddress
		var tx = await sharkbabyToken.setFeeAddresses(
			process.env.MARKETINGADDRESS, 
			process.env.GAMINGADDRESS, 
			stakingPool.address, 
			);

		await tx.wait();
	})


  	it("SHBY Add Liquidity", async function () {
		var tx = await sharkbabyToken.approve(exchangeRouter.address,ethers.utils.parseUnits("100000000",18));
		await tx.wait();

		tx = await exchangeRouter.addLiquidityETH(
			sharkbabyToken.address,
			ethers.utils.parseUnits("500000",18),
			0,
			0,
			owner.address,
			"111111111111111111111",
			{value : ethers.utils.parseUnits("5000",18)}
		);
		await tx.wait();

		// set LP balance1
			LPBalance1 = await pancakeswapV2PairContract.balanceOf(owner.address);
			
		//shark,babytoken addliquidity
			var tx = await sharkbabyToken.approve(
				exchangeRouter.address,
				ethers.utils.parseUnits("100000000", 18)
			);
			await tx.wait();

			var tx = await sharkToken.approve(
				exchangeRouter.address,
				ethers.utils.parseUnits("100000000", 18)
			);
			await tx.wait();

			var tx = await babyToken.approve(
				exchangeRouter.address,
				ethers.utils.parseUnits("100000000", 18)
			);
			await tx.wait();

			tx = await exchangeRouter.addLiquidity(
				sharkbabyToken.address,
				sharkToken.address,
				ethers.utils.parseUnits("500000", 18),
				ethers.utils.parseUnits("500000", 18),
				0,
				0,
				owner.address,
				"111111111111111111111",
			);
			await tx.wait();

			tx = await exchangeRouter.addLiquidity(
				sharkbabyToken.address,
				babyToken.address,
				ethers.utils.parseUnits("500000", 18),
				ethers.utils.parseUnits("500000", 18),
				0,
				0,
				owner.address,
				"111111111111111111111"
			);
			await tx.wait();
		});
	
	it("staking test", async function () {
		var tx = await sharkbabyToken.approve(
			stakingPool.address,
			ethers.utils.parseUnits("100000000", 18)
		);
		await tx.wait();

		console.log(stakingPool.address);
		tx = await stakingPool
			.stake(ethers.utils.parseUnits("1000", 18));
			
	});

});

describe("sharkbabyToken General  test", function () {
	it("name, symbol, totalSupply (BEP20) test", async function () {
		var name = await sharkbabyToken.name();
		var symbol = await sharkbabyToken.symbol();
		var totalSupply = await sharkbabyToken.totalSupply();

		// name is PLEDGE
		expect(name).to.equal("sharkbaby");
		
		// symbol is SHBY
		expect(symbol).to.equal("SHBY");

	})

	it("sharkbabyToken-eth test", async function () {
		
		var swapAmount = ethers.utils.parseUnits("100000",18);
		
		var initsharkbabyBalance = await sharkbabyToken.balanceOf(owner.address);
		var initETHTokenBalance = await owner.getBalance();
		var exceptSwapBalance = (await exchangeRouter.getAmountsOut(swapAmount,[sharkbabyToken.address,wETH.address]))[1];

		var tx = await sharkbabyToken.approve(exchangeRouter.address,swapAmount);
		await tx.wait();

		tx = await exchangeRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
			swapAmount,
			0,
			[sharkbabyToken.address,wETH.address],
			owner.address,
			"99000000000000000"
		)
		await tx.wait()

		let  buySharkTokenAmount = await sharkbabyToken.balanceOf(owner.address);
		let  buyETHAmount = await owner.getBalance();

		console.log(
			"shark-eth ",
			ethers.utils.formatUnits(initsharkbabyBalance.sub(buySharkTokenAmount),18),
			ethers.utils.formatUnits(buyETHAmount.sub(initETHTokenBalance),18),
			ethers.utils.formatUnits(exceptSwapBalance,18)
		);
	});

	it("marketing, game fee test", async function () {
		var marketingAddress = await sharkbabyToken.marketingAddress();
		var gameAddress = await sharkbabyToken.gameAddress();

		var marketingAddressBalance  = await sharkbabyToken.balanceOf(marketingAddress);
		var gameAddressBalance  = await sharkbabyToken.balanceOf(gameAddress);

		console.log(fromBigNum(marketingAddressBalance,18), fromBigNum(gameAddressBalance,18))
		
	});
	


	it("test apy", async () => {
		var path_1 = [];
        path_1[0] = sharkbabyToken.address;
		path_1[1] = sharkToken.address;
		
		// console.log(exchangeRouter);
		var amountsin = await exchangeRouter.getAmountsIn("100", path_1);
		// var prouter = await stakingPool.pancakeswapRouter();
		console.log(amountsin);
		// var apy = await stakingPool.APY();
		// console.log(apy);
	})
});


