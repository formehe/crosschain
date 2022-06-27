## **合约**

#### ETH端

- **ERC20Locker.sol**

用途：ERC20代币的锁定及解锁合约

- **EthLocker.sol**

用途：Eth的锁定及解锁合约

- **TopProver.sol**

用途：收据和块头验证合约

- **TopBridge.sol**

用途：top端块头同步合约

- **Limit.sol**

用途：限制（如收据id黑名单，解锁时长限制，锁定金额限制）合约

- **ERC20TokenSample.sol**

用途：资产合约

<br> 

#### Top端

- **TopErc20Wrapper.sol**
  
  ```
  用途：资产合约

  constructor(string memory name_, string memory symbol_, uint8 decimals_, bytes1 uuid_) {
      name = name_;
      symbol = symbol_;
      decimals = decimals_;
      uuid = uuid_;
  }
  
  enum class xtop_token_id : uint8_t {
      invalid = 0,
      top = 1,
      eth = 2,
      usdt = 3,
      usdc = 4,
  };
  
  对应token id从里面取，但是针对mint和burnfrom都是有权限的，测试需要让相关人员添加权限

  ```

  注：如测试也可以直接部署ERC20Sample合约

- **Limit.sol**

  用途：限制（如收据id黑名单，解锁时长限制，锁定金额限制）合约

- **ERC20MintProxy.sol**
  
  用途：铸造和销毁资产合约

  注：TRC20.sol也是一样的

- **EthProver.sol**

  用途：收据和块头验证合约

- **HeaderSync.sol**

  用途：初始top块头同步的合约

<br> 

## **合约方法**

#### ETH端

- **ERC20Locker.sol**

  **(1),function _ERC20Locker_initialize(ITopProver _prover,uint64 _minBlockAcceptanceHeight,address _owner,ILimit _limit)**

  ```

  方法：初始化

  权限：

  只能调用一次

  参数：

  _prover：验证合约

  _minBlockAcceptanceHeight：当前传0就行
  
  _owner：owner

  _limit :限制合约

  ```


  **(2),function lockToken(address fromAssetHash, uint256 amount, address receiver) public**
  
  ```
  方法：锁定资产

  权限：
  owner或者
  当前没有暂停&&sender不在黑名单(BLACK_LOCK_ROLE权限组)

  补充说明：

  除上面权限外还会校检

  (1),fromAssetHash和receiver是否是空地址及amount是否为0

  (2),from是否有绑定地址（通过bindAssetHash绑定的）
  
  (3),amount是否在配置的锁定金额区间（满足最大最小）

  (4),safeTransferFrom


  参数：

  fromAssetHash: token

  amount:数量

  receiver：接收地址

  ```


  **(3),function unlockToken(bytes memory proofData, uint64 proofBlockHeight) public**
  
  ```
  方法：解锁资产

  权限：

  owner或者
  当前没有暂停&&sender不在黑名单(BLACK_UN_LOCK_ROLE权限组)&&收据id不在黑名单

  补充说明：

  除上面权限外还会校检

  (1),收据验证，head验证，log验证（event事件的hash及事件参数的长度及参数的验证）

  (2),是否重复解锁及解锁时长

  参数:

  proofData:证明

  proofBlockHeight：高度（当前传0就行）

  ```


  **(4),function assets(address _address) returns(ToAddressHash)**  

  ``` 
  方法:获取对端的token地址及跨链合约

  参数：

  address：eth端的token地址
  
  返回：

  struct ToAddressHash{
        address assetHash; //top端token

        address lockProxyHash;top端跨链合约（例如ERC20MintPxoxy）
  }

  ``` 


  **(5),function bindAssetHash(address _fromAssetHash, address _toAssetHash,address _peerLockProxyHash)**  

  ``` 
  方法:绑定top端的资产及跨链合约

  特殊说明：

  如果是锁定eth,_fromAssetHash则是空地址

  参数：

  _fromAssetHash：eth端的token地址

  _toAssetHash：top端的token地址

  _peerLockProxyHash：top端的跨联合约（如ERC20MintProxy）


  ``` 


- **ETHLocker.sol**

  ```
  同上，只是资产的地址是空地址

  ```
 

- **Limit.sol**

**(1),function bindTransferedQuota(address _asset, uint256 _minTransferedToken, uint256 _maxTransferedToken)**

```
  方法：锁定金额的限制

  权限：owner

  参数:

  _asset:token

 _minTransferedToken:最小金额

 _maxTransferedToken：最大金额

```


**(2),function bindFrozen(address _asset, uint _frozenDuration)**

  ```
  方法：解锁时长的设置  

  权限：owner

  参数：

  _asset：token

  _frozenDuration：时间

  ```


**(3),function forbiden(bytes32 _forbiddenId)**

  ```
  方法：收据id黑名单的添加

  权限：owner

  参数：

  _forbiddenId：id

  （块高 + 收据index）字节数组的keccak256   

  ```


**(4),function recover(bytes32 _forbiddenId)** 

  ```
  方法：收据id黑名单的解除

  权限：owner

  参数：

  _forbiddenId：id

  （块高 + 收据index）字节数组的keccak256   

  ```   


- **TopBridge.sol**

**(1),function initialize(uint256 _lockEthAmount,address _owner)**

  ``` 
  方法：初始化

  权限：只能初始化一次

  参数：

  _lockEthAmount：目前传0就行

  _owner：owner地址（目前可以是部署地址）

  ```


**(2),function initWithBlock(bytes memory data)**

  ``` 
  方法：初始创世块

  权限：owner&&只能初始化一次

  参数：

  data：块头的rlp编码字节流

  ``` 


**(3),function addLightClientBlocks(bytes memory data)**

  ``` 
  方法：同步块头

  权限：当前没有暂停&&sender属于admin(ADDBLOCK_ROLE权限组)

  参数：

  data：块头的rlp编码字节流

  ``` 


**(4),function blockHashes(bytes32 hash) returens(bool)**

  ``` 
  方法：某一块头是否已经同步

  权限：无

  参数：

  bytes32：block的hash

  ``` 


**(5),function blockHeights(bytes32 hash) returens(uint256)**

  ``` 
  方法：某一块头的同步时间

  权限：无

  参数：

  bytes32：block的hash

  ``` 


**(6),function maxMainHeight()**
  
  ``` 
  方法:当前同步块头的最大高度

  权限：无

  参数：

  ``` 


- **TopProver.sol**


**(1),constructor(address _bridgeLight)**

  ``` 
  方法:构造函数

  权限：无

  参数：

  _bridgeLight：TopBridge合约

  ``` 

<br> 

#### TOP端

- **ERC20MintProxy.sol**


 **(1),function initialize(IEthProver _prover,address _peerProxyHash,uint64 _minBlockAcceptanceHeight,ILimit _limiter)**

  ```
  方法：初始化

  权限：

  只能调用一次

  参数：

  _prover：验证合约(EthProver)

  _peerProxyHash:对端的跨链合约（如ERC20Locker合约）

  _minBlockAcceptanceHeight：当前传0就行
  
  _limiter：限制合约（Limit）

  ```


 **(2),function mint(bytes memory proofData, uint64 proofBlockHeight) public pausable (PAUSED_MINT)**
  
  ``` 
  方法:铸造资产

  权限：
  owner或者
  当前没有暂停&&sender不在黑名单(BLACK_MINT_ROLE权限组)&&收据id不在黑名单

  补充说明：

  除上面权限外还会校检

  (1),收据验证，head验证，log验证（event事件的hash及事件参数的长度及参数的验证）

  (2),是否重复解锁及解锁时长

  参数：

  proofData：证明

  proofBlockHeight：高度（暂时没用传0就行）


  ``` 


 **(3),function burn(address localAssetHash, uint256 amount, address receiver) public pausable (PAUSED_BURN)**
  
  ``` 

  方法:销毁资产

  权限：

  owner或者
  当前没有暂停&&sender不在黑名单(BLACK_BURN_ROLE权限组)

  补充说明：

  除上面权限外还会校检

  (1),localAssetHash和receiver是否是空地址（localAssetHash并且合约地址）及amount是否为0

  (2),localAssetHash的绑定地址是否存在（通过bindAssetHash绑定的）
  
  (3),amount是否在配置的锁定金额区间（满足最大最小）

  (4),burnFrom（这面top代币的合约地址会有权限的校检，只有当前合约可以销毁）

  参数：

  localAssetHash：资产地址

  amount：数量

  receiver：接收地址

  ```   


 **(4),function bindAssetHash(address localAssetHash, address peerAssetHash)** 

  ``` 
  方法：绑定eth端的资产

  参数：

  localAssetHash：top端的token地址

  peerAssetHash：eth端的token地址

  ``` 


 **(5),function lockProxyHash() returns(address)**  

  ``` 
  方法:对端跨链合约地址（例如eth端的ERC20Locker合约）

  参数：无

  ``` 


 **(6),function assets(address _address) returns(ProxiedAsset)** 

  ``` 
  方法:资产与对端资产的绑定查询

  参数：

  address：top端的token地址

  ``` 


- **EthProver.sol**  
  

  **(1),constructor(address _bridgeLight)**

  ``` 
  方法:构造函数

  权限：无

  参数：

  _bridgeLight：ff00000000000000000000000000000000000002

  ``` 


- **HeaderSync.sol**  
  
  **(1),constructor(address _bridgeLight)**

  ``` 
  方法:构造函数

  权限：无

  参数：

  _bridgeLight：ff00000000000000000000000000000000000002

  ``` 


  **(2),function initGenesisHeader(bytes memory genesis, string memory emitter)**

  ``` 
  方法:初始化创世块头

  权限：无

  参数：

  genesis：eth head的rlp字节流

  emitter：目前没用0x就行

  ``` 


- **Limit.sol**

**同eth端**

<br>

## **其他说明**

- **针对暂停权限**

eth端和top端的跨链合约都会继承AdminControlledUpgradeable.sol(如eth的ERC20Locker和top的ERC20MintProxy)

这里面有是否暂停的方法

**(1),function adminPause(uint flags) public onlyRole(CONTROLLED_ROLE)**

  ``` 
  方法:设置是否暂停

  权限：

  CONTROLLED_ROLE权限组

  参数：

  flags：标记参数（传0都开启）

  ``` 
  
  - **针对重复解锁和铸造**

  eth端判断是否重复解锁及top端判断是否重复铸造(如eth的ERC20Locker和top的ERC20MintProxy)

  **(1),function usedProofs(bytes32 _bytes32) returns(bool)**

  ``` 

  方法:是否重复解锁及重复铸造

  参数：

  bytes32：收据id（块高 + 收据index）字节数组的keccak256  

  ``` 
<br>

## **UI调用前判断限制**

####ETH端

**(1),function lockToken()**

    UI提前限制：
    (1)，锁定金额是否在金额区间内

    Limit合约
    getTransferedQuota（address _asset）
    返回具体的数量供UI判断

**(2),function unlock()**

    UI提前限制：
    (1),解锁时长

    Limit合约
    checkFrozen(
        address _asset, 
        uint _timestamp
    )
        _timestamp的获取

        通过TopBridge合约的blockHeights(uint64 height)

   （2）黑名单（hash黑名单，地址黑名单）待定
<br>
####TOP端

**(1),function mint()**
    
    UI提前限制：
    (1),解锁时长

    Limit合约
    checkFrozen(
        address _asset, 
        uint _timestamp
    )
        _timestamp的获取

        待定

   （2）黑名单（hash黑名单，地址黑名单）待定
    

**(2),function burn()**Cancel changes

    UI提前限制：
    (1)，销毁金额是否在金额区间内

    Limit合约
    getTransferedQuota（address _asset）
    返回具体的数量供UI判断

## **部署合约**

<br>

## 部署ETH端合约

- **部署ERC20Sample.sol**
  
  ```
  参数：直接部署就行，msg.sender会作为代币持有者

  ```
 
- **部署Limit.sol**

  ```
  参数：直接部署就行，无参数，msg.sender会作为owner

  ```

- **部署ERC20Locker.sol**
  
  ``` 

  参数：直接部署就行

  ```

- **部署TopBridge.sol**

  ```
  参数：直接部署就行

  ```

- **部署TopProver.sol**

  ```
  参数1：_bridgeLight
  _bridgeLight: 上面的部署TopBridge合约
  
  ```

<br>

## 部署Top端合约

- **部署TopErc20Wrapper.sol**
  
  注：如测试也可以直接部署ERC20Sample合约

- **部署Limit.sol**
  
  ```
  参数：直接部署就行，无参数，msg.sender会作为owner
  ```

- **部署ERC20MintProxy.sol**
  
  ```
  参数：直接部署就行，无参数
  ```

- **部署EthProver.sol**
  
  ```
  参数：_bridgeLight
  _bridgeLight: top网上的块同步合约：ff00000000000000000000000000000000000002
  ```

- **部署HeaderSync.sol**
  
  ```
  参数：_bridgeLight
  _bridgeLight: top网上的块同步合约：ff00000000000000000000000000000000000002
  ```

  注：此合约是为了初始化ff00000000000000000000000000000000000002合约的创世块头

<br> 

## **两端合约配置参数**

####ETH端

- **ERC20Locker合约**

    **(1),function _ERC20Locker_initialize(ITopProver _prover,uint64 _minBlockAcceptanceHeight,address _owner,ILimit _limit)**

    **(2),function adminPause(uint flags)**
  
    ``` 
    参数：

    flags：0就行,就是开启了，如不设置，是不能进行lock和unLocker

    ```

    **(3),function bindAssetHash(address _fromAssetHash, address _toAssetHash,address _peerLockProxyHash)** 

- **Limit合约(用来限制金额)**

    **(1),function bindTransferedQuota(address _asset, uint256 _minTransferedToken, uint256 _maxTransferedToken)**

- **TopBridge合约**

    **(1),function initialize(uint256 _lockEthAmount,address _owner)**

    **(2),function initWithBlock(bytes memory data)**

初始创世块
 
 ```
 参数：

 data：rlp编码之后的head字节数组

 test传：
 00f902dcb86900f866808080a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a00000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000000f9024c80f90248f847a051559e17814b6c892f095bfaaeb11ff0cbf91a2d6ef45d77d61e24aba0d6d3fea05a9a53741dfa2b330e1f19874ec879bbd04a80f0e05e9a45bf205ea98531a13584fffffffff847a03ba526113685c55c717ea2a62410ee57ab4e38a22ce3c7151548845a85a45184a0720425107d65c4c7364f19153a6c9cc0f91d683243c9e300a045b115192107ba84fffffffff847a0d4477911b0e186674c778d1b162db80b2f4ac95357b4c732cdc0f5124cfb5560a0eb78324385e62b68bc1d6f9fdc868ceca6af707ec93214cf1732ad5a9ec85d6e84fffffffff847a044d3804bfa1c516dc53542419062a17739336a176f988f420a0eeaa95794f133a04cf2b80f6caecf8a407d0a9fc7000146f8b49dfd44634095cbd6771c97f6f82484fffffffff847a05eded84b7ceb36373c8276061ff083170a4d3760c5f7eebda1c9dc06d1f7d6d0a0afd8c081434a0b21bda9b6036e053be1e5130d915ca0ac9c1967bb505e12705a84fffffffff847a0ffacf7a8a5bab86b68553b443d946bad2b0fc0a9803c428d6729ebbcaaec3e74a0d207f47a3e6f0468b0a99d86c2811601c5c51ea5254d05bc22a2161c293978a984fffffffff847a032f5faef900537f5e7fb2eb0ff091c0af471bac7af3f225d19cb7d9e3b8b3685a0b5cd591a10f6393b8210c50d3b47100b42e19ef67a42191a8a23ee3dbead0b9f84fffffffff847a05ca103a04fda64db80eb26b10163434f6bf625e7f9fddf99c78e6fe3b56989aba0eaa0e8ecac03bf6e6238c455f2704e82e9efe84500b630ca89dbcc13d624b81484ffffffffc0
  
 ```
 
<br>  

####TOP端

- **ERC20MintProxy.sol**

    **(1),function initialize(IEthProver _prover,address _peerProxyHash,uint64 _minBlockAcceptanceHeight,ILimit _limiter)**
 
    **(2),function adminPause(uint flags)**
  
    ```
    参数：

    flags：0就行,就是开启了，如不设置，是不能进行mint和burn

    ```
  
    **(3),function bindAssetHash(address localAssetHash, address peerAssetHash)**
  
- **Limit.sol**

    **(1),function bindTransferedQuota(address _asset, uint256 _minTransferedToken, uint256 _maxTransferedToken)**
  
- **HeaderSync.sol**

    **(1),function initGenesisHeader(bytes memory genesis, string memory emitter)**


<br> 

## **基本流程**

- 部署合约

- 执行合约配置

- 双方块头开始同步

- eth端锁定资产 -> top端铸造资产

- top端燃烧资产 -> eth端解锁资产
