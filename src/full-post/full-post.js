import React, { Component, useState, useEffect } from 'react';
import { findDOMNode } from 'react-dom';
import MdRender from '../markdown-render/markdown-render';
import Comments, {NewComment} from '../comment/comment';
import $ from 'jquery';
import './_full-post.scss';
import { hot } from 'react-hot-loader';
import Img from '../../imgs/cs-bg.svg';
import Button from '@material-ui/core/Button';
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import LazyLoad from 'react-lazyload';
import io from 'socket.io-client';
import loading from '../../imgs/loading.json';
import _Icon from '../_icon/_icon';
import lottie from 'lottie-web';

const Explained = (props) => <span className='explained'>{props.explained}</span>

class Loading extends Component {
    componentDidMount() {
        this.anim = lottie.loadAnimation({
            container: this.animBox,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: loading
        })
    }
    render() {
        return <div className='loading-icon' ref={animBox => this.animBox = animBox}/>
    }
}

const CommentSection = (props) => {
    const [view, setView] = useState(false);
    const [newQ, setNewQ] = useState(false);
    const [nb_q, setNb_q] = useState(0);

    const newQuestionComing = () => setNb_q(nb_q+1);
    useEffect(() => {
        props.socket.emit('nb comments', props.postId);
        props.socket.on(`nb comments postId=${props.postId}`, msg => setNb_q(msg))
        props.socket.on(`new comment postId=${props.postId}`, msg => newQuestionComing())
    }, [nb_q])

    const toggleView = () => setView(!view);
    const toogleNewQ = () => setNewQ(!newQ);
    let cl = 'comment-section';
    if (view) cl += ' view';
    return <div className={cl}>
        {!view ? <div className='question-bar'>
            <Button variant='contained' className='view-comments' onClick={toggleView}>
                <Icon iconName='CommentUrgent' />
                <Explained explained='view all asked questions' />
                {nb_q > 0? <span className='nb-questions'>{nb_q}</span>:null}
            </Button>
            <Button variant='contained' className='ask' onClick={toogleNewQ}>
                <Icon iconName='StatusCircleQuestionMark' />
                <Explained explained='Struggled? Ask a question' />
            </Button>
            {newQ? <NewComment {...props}/>:null}
        </div>: <div >
            <Button className='close' onClick={toggleView}><Icon iconName='ChromeClose'/></Button>
            <h3 className='channel'>#questions</h3>
            <Comments {...props}/>
        </div>}
    </div>
}

function disableDoubleClick() {
    $('.full-post .post-interact i').on('mousedown', e => {
        e.preventDefault();
    });
}

export default class FullPost extends Component {
    _mounted = false;
    state = {
        post: {
            title: '',
            likes: '',
            article: '',
            hashtags: [],
            nbComments: 0
        },
        outline: [],
        display_supp: false,
        socket: io()
    }

    _setState = (dict) => {
        // only set state when component is mounted
        if (this._mounted) {
            this.setState(dict);
        }
    }
        
    async componentDidMount() {
        // behaviors
        this._mounted = true;
        disableDoubleClick();
        let response = await fetch(`/get-full-post?postId=${this.props.postId}`, {method: 'POST'});
        let data = await response.json();
        this._setState({ post: data });

        // generate outline
        let outline = $(`<div class='outline'><h2>Outline</h2></div>`);
        let count = 0;
        this.$article = $(findDOMNode(this.article));
        let O = []
        this.$article.children('.markdown-render').children('h2').each(function() {
            outline.append(`<span><a href='#post-sec-${count}'>${$(this).html()}</a></span>`);
            O.push($(this).html());
            $(this).attr('id', `post-sec-${count}`);
            count ++;
        })
        this.setState({outline: O});
        await this.$article.children('.markdown-render').children('h1').after(outline);
        $(window).on('scroll', () => {
            if ($(window).scrollTop() > this.$article.find('.outline').first().offset().top +
                this.$article.find('.outline').first().outerHeight()) this._setState({display_supp: true});
            else this._setState({display_supp: false});
        })
    }
    
    async componentWillUnmount() {
        //this.props.socket.disconnect();
        this.$article.off();
        $(window).off('scroll', '**');
        this._mounted = false;
        this.state.socket.disconnect();
    }

    like = async () => {
        let post_ = JSON.parse(JSON.stringify(this.state.post));
        post_.likes ++;
        this._setState({post: post_});
        this.state.socket.emit(`likes`, this.props.postId);
    }


    render() {
        if (!this._mounted) return <Loading />;
        let hashtags = '';
        if (this.state.post.hashtags) {
            hashtags = (<div className='hashtags'>
                {this.state.post.hashtags.map((e, id) => (
                    <span key={id}>#{e}</span>
                ))}
                <Button 
                    className='like-post' 
                    variant='contained'
                    endIcon={<Icon iconName='Heart'/>}
                    onClick={this.like}
                > 
                    {this.state.post.likes}
                </Button>
            </div>)
        }

        let supp = this.state.display_supp? <div className='supp'>
                <h2>{this.state.post.title}</h2>
                <p>{this.state.post.intro}</p>
                <Button 
                    className='like-post' 
                    variant='outlined'
                    endIcon={<Icon iconName='Heart'/>}
                    onClick={this.like}
                > 
                    {this.state.post.likes}
                </Button>
                <div className='outline'>
                    {this.state.outline.map((l, i) => <span key={i} >
                            <a href={`#post-sec-${i}`}>{l}</a>
                        </span>)}
                </div>
            </div>: null;
        return (
            <div 
                className='full-post'
            >
                {supp}
                <div className='himmi'>
                    <LazyLoad height={400}>
                    {
                        this.state.post.himmi? <img 
                            src={require('../../imgs/' + this.state.post.himmi)}
                            alt='himmi'/>
                        : null
                    }
                    </LazyLoad>                  
                </div>
                <div 
                    className='article'
                    ref={article => this.article = article}>
                    {hashtags}
                    <MdRender 
                        source={this.state.post.article} 
                    />
                </div>
                <CommentSection postId={this.props.postId} 
                    socket={this.state.socket} 
                    user={this.props.user} 
                    nbComments={this.state.post.nbComments}/>
            </div>
        );
    }
}

if (hot.module) {
    hot.module.accept();
}