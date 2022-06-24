## 部署合约

## 部署ETH端合约

- 部署ERC20Sample.sol;
  
  ```
  参数：直接部署就行，msg.sender会作为代币持有者
  ```
 
- 部署Limit.sol;
  
  ```
  参数：直接部署就行，无参数，msg.sender会作为owner
  ```

- 部署ERC20Locker.sol;
  
  ``` 
  参数：直接部署就行
  ```

- 部署TopBridge.sol;

  ```
  参数：直接部署就行
  ```

- 部署TopProver.sol;
  
  ```
  参数1：_bridgeLight
  _bridgeLight: 上面的部署TopBridge合约
  ```

## 部署Top端合约

- 部署ERC20Sample.sol;
  
  ```
  参数：直接部署就行，msg.sender会作为代币持有者
  ```

  注：目前只是供测试使用，上线的时候部署的其实是包装top合约的solitity合约

- 部署Limit.sol;
  
  ```
  参数：直接部署就行，无参数，msg.sender会作为owner
  ```

- 部署ERC20MintProxy.sol;
  
  ```
  参数：直接部署就行，无参数
  ```

- 部署EthProver.sol;
  
  ```
  参数：_bridgeLight
  _bridgeLight: top网上的块同步合约：ff00000000000000000000000000000000000002
  ```

- 部署HeaderSync.sol;
  
  ```
  参数：_bridgeLight
  _bridgeLight: top网上的块同步合约：ff00000000000000000000000000000000000002
  ```

  注：此合约是为了初始化ff00000000000000000000000000000000000002合约的创世块头
 

## 两端合约配置参数

####ETH端

- ERC20Locker合约

(1),_ERC20Locker_initialize()

  ```
  参数：

  _prover：TopProver合约

  _minBlockAcceptanceHeight：当前0就行

  _owner：合约的owner

  limit：Limit合约

  ```

(2),adminPause(uint flags)
  
  ``` 
  参数：

  flags：0就行,就是开启了，如不设置，是不能进行lock和unLocker

  ```

(3),bindAssetHash(address _fromAssetHash, address _toAssetHash,address _peerLockProxyHash) 

  ```
  参数：

  _fromAssetHash：eth端的token

  _toAssetHash：top端的token

  _peerLockProxyHash：top端的跨链合约（例如ERC20MintProxy合约）

  ```

- Limit合约（用来限制金额）

(1),bindTransferedQuota()

  ```
  参数：

  _asset: eth端的token

  _minTransferedToken：锁定的最小金额

  _maxTransferedToken：锁定的最大金额

  ```

- TopBridge合约

(1),initialize()

  ```
  参数：

  _lockEthAmount：锁定的eth金额,目前暂未用到直接传0就行

  _owner:合约的owner

  ```

(2),initWithBlock（）

初始创世块
 
 ```
 参数：

 data：rlp编码之后的head字节数组

 test传：
 00f902dcb86900f866808080a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000f9024c80f90248f847a051559e17814b6c892f095bfaaeb11ff0cbf91a2d6ef45d77d61e24aba0d6d3fea05a9a53741dfa2b330e1f19874ec879bbd04a80f0e05e9a45bf205ea98531a13584fffffffff847a03ba526113685c55c717ea2a62410ee57ab4e38a22ce3c7151548845a85a45184a0720425107d65c4c7364f19153a6c9cc0f91d683243c9e300a045b115192107ba84fffffffff847a0d4477911b0e186674c778d1b162db80b2f4ac95357b4c732cdc0f5124cfb5560a0eb78324385e62b68bc1d6f9fdc868ceca6af707ec93214cf1732ad5a9ec85d6e84fffffffff847a044d3804bfa1c516dc53542419062a17739336a176f988f420a0eeaa95794f133a04cf2b80f6caecf8a407d0a9fc7000146f8b49dfd44634095cbd6771c97f6f82484fffffffff847a05eded84b7ceb36373c8276061ff083170a4d3760c5f7eebda1c9dc06d1f7d6d0a0afd8c081434a0b21bda9b6036e053be1e5130d915ca0ac9c1967bb505e12705a84fffffffff847a0ffacf7a8a5bab86b68553b443d946bad2b0fc0a9803c428d6729ebbcaaec3e74a0d207f47a3e6f0468b0a99d86c2811601c5c51ea5254d05bc22a2161c293978a984fffffffff847a032f5faef900537f5e7fb2eb0ff091c0af471bac7af3f225d19cb7d9e3b8b3685a0b5cd591a10f6393b8210c50d3b47100b42e19ef67a42191a8a23ee3dbead0b9f84fffffffff847a05ca103a04fda64db80eb26b10163434f6bf625e7f9fddf99c78e6fe3b56989aba0eaa0e8ecac03bf6e6238c455f2704e82e9efe84500b630ca89dbcc13d624b81484ffffffffc0
  
 ```
  
####TOP端

- ERC20MintProxy合约

(1),initialize()
 
 ```
 参数：

 _prover:EthProver合约

 _peerProxyHash：eth端的跨链合约（例如ERC20Locker合约） 

 _minBlockAcceptanceHeight: 当前传0就行

 _limiter：Limit合约

 ```

(2),adminPause(uint flags)
  
  ```
  参数：

  flags：0就行,就是开启了，如不设置，是不能进行mint和burn

  ```
  
(3),bindAssetHash()
  
  ```
  参数：

  localAssetHash：top端的token

  peerAssetHash： eth端的token

  ```

- Limit合约（用来限制金额 ）

(1),bindTransferedQuota()
  
  ```
  参数：

  _asset: top端的token

  _minTransferedToken：锁定的最小金额

  _maxTransferedToken：锁定的最大金额

  ```

- HeaderSync合约（用来初始化top端的eth块头）

(1),initGenesisHeader()
  
  ```
  参数：

  genesis：rlp编码之后的head字节数组

  emitter: 目前随便传就行
  
  ```
