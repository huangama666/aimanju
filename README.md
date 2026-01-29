如何在本地部署或编辑代码？
下载完代码包后，您首先需要先按照下面要求准备好环境（安装Node.js和npm），再用IDE打开代码包进行应用的本地部署运行。

IDE：您可以选择VSCode：https://code.visualstudio.com/Download，或者IntelliJ IDEA IDE：https://www.jetbrains.com/idea/，或者选取您常用的IDE进行代码本地编辑。

环境准备
Plain Text复制
  # Node.js ≥ 20
  # npm ≥ 10
例如：
  # node -v   # v20.18.3
  # npm -v    # 10.8.2
在Windows上安装Node.js
Plain Text复制
# Step 1: 访问Node.js官网：https://nodejs.org/,点击下载后，会根据你的系统自动选择合适的版本（32位或64位）。
# Step 2: 运行安装程序：下载完成后，双击运行安装程序。
# Step 3: 完成安装：按照安装向导完成安装过程。
# Step 4: 验证安装：在命令提示符（cmd）或IDE终端（terminal）中输入node -v和npm -v来检查Node.js和npm是否正确安装。
4.png

在macOS上安装Node.js
Plain Text复制
# Step 1:方法一（推荐使用，更简单）：使用官网安装程序：访问Node.js官网:https://nodejs.org/。下载macOS的.pkg安装包。打开下载的.pkg文件，按照提示完成安装。 
         方法二：使用Homebrew安装（推荐方法）：
          先安装Homebrew：打开终端，在终端中输入命令行：
          /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" 
          然后在终端中输入命令行：brew install node 并回车。
# Step 2: 验证安装：在命令提示符（cmd）或IDE终端（terminal）中输入node -v和npm -v来检查Node.js和npm是否正确安装。
方法一：

打开Node.js官网
5.png
2.找到对应Node.js的版本，点击下载按钮
6.png
3.安装Node.js
7.png
4.在终端中检查node和npm是否安装成功
8.png
方法二： 1.终端输入命令行：/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

9.png

2.在终端输入命令行：brew install node

10.png

3.终端中检查node和npm是否安装成功

11.png
准备好环境后的操作步骤
非小程序应用
准备与启动

Plain Text复制
# Step 1: 下载代码包
# Step 2: 解压代码包
# Step 3: 用IDE打开代码包，进入代码目录
# Step 4: IDE终端输入命令行，安装依赖：npm i
# Step 5: IDE终端输入命令行，启动开发服务器：npm run dev -- --host 127.0.0.1
# Step 6: 若step5执行失败，可尝试指令：npx vite --host 127.0.0.1
Step 4、5示例：
12.png
本地部署成功，点击本地链接查看应用：
13.png

小程序应用
准备

Plain Text复制
# Step 1: 下载代码包
# Step 2: 解压代码包
# Step 3: 用IDE打开代码包，进入代码目录
# Step 4: IDE终端输入命令行，安装依赖：npm i
启动h5模式

Plain Text复制
# Step 5: IDE终端输入命令行，启动开发服务器：npx taro build --type h5 --watch
# Step 6: 访问输出的链接，即可预览
启动微信小程序模式（weapp模式）

Plain Text复制
# Step 5: 前往微信开发者工具官网（https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html）下载并安装最新版本。
# Step 6: 打开微信开发者工具，选择“导入项目”，将项目目录设置为 源码包的目录（即包含 package.json 的文件夹），AppID 填写为自己微信小程序的AppID（在微信公众平台获取）。
# Step 7: 在终端执行npx taro build --type weapp --watch，在左侧即可预览
微信开发者工具-导入项目示例：

w01.png

新建终端-执行命令示例：

w02.png

如何开发后端服务？
含有后端数据存储功能的应用，开发者拿到源码后，还需自行接入supabase项目进行相应二次开发和管理。

supabase官网地址：https://supabase.com/

supabase导入sql运行
14.png 15.png

源码包.env替换url和key
16.png 17.png

具体替换内容
对url和key进行替换

注意：VITE_SUPABASE_PROXY=true需要改为false 18.png 19.png

如何配置应用中的三方api？
对于调用了三方api服务的应用，秒哒平台线上运行应用时，自动提供了免费的三方api服务供开发者和用户使用。

若开发者下载应用代码包后，仍希望该类应用在本地部署运行，则需要自行购买相关三方api服务，并进行二次开发方能部署和运行，需要一定代码开发经验。

三方api服务清单
下表是应用中可能会调用到的三方api服务清单，其中大部分服务支持开发者自行购买后二次开发，仅appbuilder的智能问答以及appbuilder的网页内容总结不支持开发者二次开发：

插件名称
插件描述
用户是否可自行购买
购买链接
购买路径
短信验证码	提供稳定、高效的短信验证码发送功能	✅	https://console.bce.baidu.com/smsv3/#/smsv3/landing	/
全国天气预报查询	提供查询今日实时天气、未来24小时、未来7天、15天天气等数据的功能，并支持返回气象灾害预警、生活指数等信息	✅	https://apis.baidu.com/store/detail/61019821-aab7-40e3-988f-0da9c1b49683	/
股票实时行情查询	提供全球各类金融数据查询功能，包括全球主要股市、汇市以及期货市场行情等，实时行情查询，即时更新	✅	https://apis.baidu.com/store/detail/1c8deedc-1c14-4e28-8a57-22b519df41e7	/
地图定位	提供地图定位功能，涵盖地理编码和逆地理编码，为应用提供实时的位置定位与检索能力	✅	地理编码：https://lbsyun.baidu.com/faq/api?title=webapi/guide/webservice-geocoding地理逆编码：https://lbsyun.baidu.com/faq/api?title=webapi/guide/webservice-geocoding-abroad-base	/
通用文字识别（高精度版）	提供多场景、多语种、高精度的文字识别功能，可对图片全部文字内容进行检测识别，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/ocr/overview/index	概览-服务列表-通用场景OCR-通用文字识别（高精度版）
身份证识别	提供对二代居民身份证正反面信息进行结构化识别的功能，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/ocr/overview/index	概览-服务列表-卡证OCR-身份证识别
火车票识别	提供对红/蓝火车票、铁路电子客票进行结构化识别的功能，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/ocr/overview/index	概览-服务列表-财务票据OCR-火车票识别
出租车票识别	提供对全国各大城市出租车票进行识别的功能，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/ocr/overview/index	概览-服务列表-财务票据OCR-出租车票识别
飞机行程单识别	提供对飞机行程单进行结构化识别的功能，并能够对单张行程单上的多航班进行信息识别，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/ocr/overview/index	概览-服务列表-财务票据OCR-飞机行程单识别
网约车行程单识别	提供对各大主要服务商的网约车行程单进行结构化识别的功能，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/ocr/overview/index	概览-服务列表-财务票据OCR-网约车行程单识别
汽车票识别	提供对全国范围不同版式汽车票信息进行识别的功能，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/ocr/overview/index	概览-服务列表-财务票据OCR-汽车票识别
人脸对比	提供对两张图片中的人脸进行相似度对比的功能，满足认证合一验证、用户认证等场景需求，支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/face/overview/index	概览-服务列表-基础服务- V3版本-人脸对比
人脸搜索	提供在人脸库中搜索最相似的人脸的功能，需配合人脸库管理服务使用	✅	https://console.bce.baidu.com/ai-engine/face/overview/index	概览-服务列表-基础服务- V3版本-人脸搜索
人脸库管理	提供对上传的人脸进行管理的功能，包括人脸注册、用户信息查询、获取用户列表和删除用户	✅	https://console.bce.baidu.com/ai-engine/face/overview/index	概览-服务列表-基础服务- V3版本-人脸库管理
通用物体和场景识别	提供对通用物体和场景识别的功能，可识别超过10万类常见物体和场景，广泛适用于图像或视频内容分析、拍照识图等业务场景。支持上传jpg、jpeg、png、bmp格式图片	✅	https://console.bce.baidu.com/ai-engine/imagerecognition/overview/index	概览-服务列表-全部接口-通用物体和场景识别高级版
图像内容理解	提供对图像内容进行理解的功能，可多维度识别与理解图片内容，包括人、物、行为、场景、文字等，支持输出对图片内容的一句话描述，同时返回图片的分类标签、文字内容等信息。支持上传jpg、jpeg、png、bmp、webp格式图片	✅	https://console.bce.baidu.com/ai-engine/imagerecognition/overview/index	概览-服务列表-全部接口-图像内容理解
文本翻译-通用版	提供多种语言互译的在线文本翻译功能，广泛应用于移动端、PC网站等不同产品形态中，满足多领域、多场景的翻译需求	✅	https://console.bce.baidu.com/ai-engine/machinetranslation/overview/index	概览-服务列表-本文翻译-文本翻译-通用版
智能问答	使用千帆AppBuilder智能体为应用提供智能问答能力，需关联智能体后使用	❌	/	/
长文本语音合成	提供长文本语音合成功能，能够将超长文本快速转换成稳定流畅、饱满真实的音频，可设置发音人、语速、语调等属性	✅	https://console.bce.baidu.com/ai-engine/speech/overview/index	概览-服务列表-语音合成-长文本在线合成
短语音识别	提供短语音识别功能，能够将60秒以内的语音精准识别为文字，适用于语音输入、智能语音交互、语音指令、语音搜索等短语音交互场景	✅	https://console.bce.baidu.com/ai-engine/speech/overview/index	概览-服务列表-语音识别-短语音识别
图片生成	提供图片生成功能，基于用户主动提供的文本、参考图像，生成各种无幻觉、超真实的图片。当前插件仅支持单次生成1张1024*1024的图片	✅	https://console.bce.baidu.com/ai-engine/intelligentwriting/overview/index	概览-服务列表-全部接口-AI作画-iRag版
百度搜索	提供百度搜索功能，满足多样的常规搜索需求	✅	https://console.bce.baidu.com/ai_apaas/resource	资源额度-组件-百度搜索
百度AI搜索	提供百度AI搜索功能，支持常规搜索，并在搜索结果的基础上提供大模型内容总结，免于纷繁的信息筛选提炼	✅	https://console.bce.baidu.com/ai_apaas/resource	资源额度-组件-百度AI搜索
网页内容总结	提供网页内容总结功能，可访问并阅读网页内容，满足网页总结、问答等诉求	❌	/	/
文本生成大模型	使用文本生成大模型为应用构建AI功能。能够对文本内容进行理解，可用于文本生成与创作、AI聊天、语言润色与优化、文本摘要提炼、文本翻译、数据分析等场景。目前支持百度文心大模型ERNIE 4.5 Turbo	✅	https://console.bce.baidu.com/qianfan/ais/console/presetService	在线推理-预置推理服务-大语言模型-ERNIE-4.5-Turbo
多模态理解大模型	使用多模态理解大模型为应用构建AI功能。能够对文本、图片内容进行理解，可用于文本生成与创作、AI聊天、图片内容理解、多模态内容翻译、拍照解题、OCR识别等场景。目前支持百度文心大模型ERNIE 4.5 Turbo VL	✅	https://console.bce.baidu.com/qianfan/ais/console/presetService	在线推理-预置推理服务-大语言模型-ERNIE-4.5-Turbo-VL
三方api二次开发示例
下面示例，基于【文本翻译小工具】（含【文本翻译 - 通用版】接口）展开，详细演示插件源码导出后的接口替换、配置适配等二次开发核心流程，助力开发者快速掌握源码二次开发方法。

应用介绍
【文本翻译小工具】提供多种语言互译功能，基于【文本翻译-通用版】接口实现。

20.png

准备工作：获取官方接口资源
购买链接：百度智能云 - 文本翻译服务
温馨提示：新用户或首次开通该服务时，平台通常提供一定额度的免费调用资源（具体以百度智能云官方实时政策为准），可优先使用免费额度完成接口调试，降低开发成本。
购买路径：概览 → 服务列表 → 文本翻译 → 文本翻译-通用版
需获取信息：开通后请记录以下关键内容，后续配置需使用

接口密钥（API Key/Secret Key，妥善保管，避免泄露）
官方接口文档：百度翻译API文档（可查阅接口参数及错误码说明）
接口配置步骤
接口地址与跨域配置
服务地址：https://aip.baidubce.com

浏览器基于 同源策略（协议、域名、端口三者需完全一致）会拦截跨域请求：当您从本地开发环境（如 http://localhost:3000）直接调用百度翻译官方接口（https://aip.baidubce.com）时，因域名与协议不同，浏览器会判定为跨域请求并阻止，导致接口调用失败。

为解决该问题，需通过 Vite 配置本地代理：将本地开发环境中指向 /baidu-api 的请求，转发至百度翻译官方接口地址，相当于由 Vite 服务充当 “中间桥梁”，规避浏览器同源策略限制，确保接口正常通信。

步骤1：修改Vite配置文件
打开 vite.config.ts 文件，添加以下代理配置

21.png

Plain Text复制
server: {
    watch: {
      ignored: ['**/{node_modules,.git,dist,logs,temp}/**'],
      usePolling: true,
      interval: 300,
    },
    port: 3000,
    open: false,
    // 添加代理配置解决跨域问题
    proxy: {
      '/baidu-api': {
        target: 'https://aip.baidubce.com',// 百度翻译官方服务地址
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/baidu-api/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('代理错误:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('发送请求到目标服务器:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('从目标服务器收到响应:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
步骤2：修改API基础地址
打开 utils/api.ts 文件，将接口基础地址指向代理路径：const API_BASE_URL = "/baidu-api" // 使用Vite代理地址

Plain Text复制
const API_BASE_URL = "/baidu-api"  // 使用Vite代理
22.png

接口路径替换
打开 utils/api.ts 文件，将接口路径替换为官方真实路径：

// 修改前的接口调用 apiClient.post(/原路径, data),

// 修改后的接口调用 apiClient.post(/rpc/2.0/mt/texttrans/v1, data),

23.png

Plain Text复制
apiClient.post(`/rpc/2.0/mt/texttrans/v1`, data),
添加鉴权信息
此配置方法仅用于本地调试！
前端 utils/api.ts 中明文存储密钥，用户可通过浏览器 “开发者工具” 直接查看，一旦泄露会导致接口资源被恶意盗用，产生额外费用。 生产环境需要使用后端托管密钥。

打开 utils/api.ts，在请求头添加：

Plain Text复制
headers: {
// 其他已有配置...
"Authorization": "Bearer {{您的密钥}}",  // 替换为实际获取的密钥
}
24.png

响应格式适配
平台对原始接口响应做了包装处理，需调整为官方原始响应格式的解析逻辑。

包装前后响应对比
包装前原始接口响应

Plain Text复制
{
    "result": {
        "from": "en",
        "trans_result": [
            {
                "dst": "你好",
                "src": "hello"
            }
        ],
        "to": "zh"
    },
    "log_id": 1958504271984380674
}
包装后接口响应

Plain Text复制
{
    "data": {
        "trans_result": [
            {
                "dst": "你好",
                "src": "hello"
            }
        ],
        "from": "en",
        "to": "zh"
    },
    "status": 0,
    "msg": ""
}
打开 App.tsx 文件，将响应处理逻辑修改如下：
status字段在原始接口中不存在，一些使用status的判断可以删除。
替换前：
111.png

Plain Text复制
try {
      const response = await api.translate({
        q: sourceText,
        from: sourceLang,
        to: targetLang,
      });

      if (response.status === 0 && response.data?.trans_result) {
        const result = response.data.trans_result
          .map((item: any) => item.dst)
          .join('\n');
        setTranslatedText(result);
      } else if (response.status === 999) {
        setError(response.msg || '翻译失败，请重试');
      } else {
        setError('翻译失败，请重试');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      if (err.response?.data?.status === 999) {
        setError(err.response.data.msg || '翻译失败，请重试');
      } else {
        setError('网络错误，请检查网络连接后重试');
      }
    } finally {
      setLoading(false);
    }
替换后：
112.png

Plain Text复制
try {
      const response = await api.translate({
        q: sourceText,
        from: sourceLang,
        to: targetLang,
      });

      if (response.result?.trans_result) {
        // 存在翻译结果时处理
        const result = response.result.trans_result
          .map((item: any) => item.dst)
          .join('\n');
        setTranslatedText(result);
      } else {
        // 没有翻译结果时显示错误
        setError('翻译失败，请重试');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
        setError('翻译失败，请重试');
    } finally {
      setLoading(false);
    }
验证与测试
确保所有配置文件已保存并重启开发服务器
输入测试文本进行翻译操作，验证是否能正常获取翻译结果
若出现错误，可通过浏览器控制台的Network面板查看请求详情，排查问题
提示：如遇接口调用失败，可参考百度翻译API错误码说明排查问题原因
