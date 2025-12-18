# Asynqmon 开发环境
# Go + Node.js + 开发工具

FROM mcr.microsoft.com/devcontainers/go:1-1.22-bookworm

# 设置 Go 代理和环境变量
ENV GOPROXY=https://goproxy.cn,direct \
    GO111MODULE=on \
    GOPATH=/go \
    PATH=$PATH:/go/bin

# 安装开发工具
RUN apt-get update && apt-get install -y \
    git \
    make \
    vim \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /workspace

