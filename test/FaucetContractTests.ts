import { expect } from "chai";
import { ethers } from "hardhat";

describe("FaucetContractContract", function () {

  async function deployContractFixture() {
    // Get the ContractFactory and Signers here.
    const ContractFactory = await ethers.getContractFactory("FaucetContract")
    const [owner, addr1, addr2] = await ethers.getSigners()
    const instance = await ContractFactory.deploy()
    await instance.deployed()
    return { ContractFactory, instance, owner, addr1, addr2 }
  }

  const DEFAULT_AMOUT_TO_DEPOSIT_IN_ETHER = 1000
  const DEFAULT_AMOUT_TO_SEND_AS_OWNER_IN_ETHER = 2
  const DEFAULT_INITIAL_AMOUNT = "200000000000000000"

  it("deposit amout", async function () {
    const { instance, owner } = await deployContractFixture()

    let tx = await instance.connect(owner).deposit({
      value: DEFAULT_AMOUT_TO_DEPOSIT_IN_ETHER
    })
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)

    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![0]).to.equal("OnDeposit")

  })

  it("seed funds as owner", async function () {
    const { instance, owner, addr1 } = await deployContractFixture()

    await instance.connect(owner).deposit({
      value: DEFAULT_AMOUT_TO_DEPOSIT_IN_ETHER
    })
    let tx = await instance.connect(owner).sendFunds(addr1.address, DEFAULT_AMOUT_TO_SEND_AS_OWNER_IN_ETHER)
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)
    
    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![0]).to.equal("OnSendFunds")
  })

  it("get initial amount", async function () {
    const { instance, owner } = await deployContractFixture()

    let initialAmout = await instance.connect(owner).getInitialAmount()
    
    expect(initialAmout).to.equal(DEFAULT_INITIAL_AMOUNT)
  })

  it("set initial amount", async function () {
    const { instance, owner } = await deployContractFixture()
    let newInitialAmout = "400000000000000000"

    await instance.connect(owner).setInitialAmount(newInitialAmout)
    let initialAmout = await instance.connect(owner).getInitialAmount()
    
    expect(initialAmout).to.equal(newInitialAmout)
  })

  it("request seed funds", async function () {
    const { instance, owner, addr1 } = await deployContractFixture()
    let newInitialAmout = "1"

    await instance.connect(owner).deposit({
      value: DEFAULT_AMOUT_TO_DEPOSIT_IN_ETHER
    })
    await instance.connect(owner).setInitialAmount(newInitialAmout)
    let tx = await instance.connect(addr1).requestSeedFunds()
    let receipt = await tx.wait()
    let events = receipt.events?.map((x) => x.event)


    expect(events).to.be.an('array').that.is.not.empty
    expect(events!![0]).to.equal("OnRequestSeedFunds")
  })
});
